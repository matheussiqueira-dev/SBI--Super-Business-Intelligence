package com.swee.ordermanagementspring.api.management;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swee.ordermanagementspring.entities.StoreTime;
import com.swee.ordermanagementspring.support.PdvFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * [CT-APR-18, CT-APR-19] Exportacao do recorte de analises (D-EVO-55). Duas invariantes que a entrega afirma:
 * a planilha usa as mesmas definicoes do painel para o mesmo recorte — inclusive o ticket medio, que divide o
 * faturamento BRUTO pelos pedidos pagos, como ManagementService — e, quando um filtro torna a comparacao com a
 * meta invalida, o arquivo diz o motivo em vez de afirmar que nao existe meta cadastrada.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Tag("integration")
class ExportApiTest {

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate template;
    @Autowired JdbcClient jdbc;

    private final ObjectMapper json = new ObjectMapper();
    private MockMvc mvc;
    private PdvFixtures fx;
    private long mouse;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        fx = new PdvFixtures(template, jdbc);
        mouse = fx.product("EXP-001", "Mouse", "100.00", 20, "60.00");
    }

    private MvcResult call(MockHttpServletRequestBuilder request, long actor) throws Exception {
        return mvc.perform(request.with(user(fx.principal(actor))).with(csrf())).andReturn();
    }

    private long paidSale(long seller, int quantity) throws Exception {
        MvcResult created = call(post("/sales/orders").header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"customerId":%d,"items":[{"productId":%d,"quantity":%d}],"payment":{"type":"PIX"},"fulfillment":"PICKUP"}"""
                        .formatted(fx.customer, mouse, quantity)), seller);
        assertThat(created.getResponse().getStatus()).as(created.getResponse().getContentAsString()).isEqualTo(201);
        long order = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        assertThat(call(post("/sales/orders/" + order + "/payment"), seller).getResponse().getStatus()).isEqualTo(200);
        return order;
    }

    /** Corpo do CSV da exportacao, como o navegador o recebe. */
    private String csv(String query, long actor) throws Exception {
        MvcResult result = call(get("/analytics/export?" + query + "&format=CSV"), actor);
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(200);
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }

    private static String field(String csv, String label) {
        return Arrays.stream(csv.split("\n")).filter(line -> line.startsWith(label + ";"))
                .map(line -> line.substring(label.length() + 1).trim()).findFirst()
                .orElseThrow(() -> new AssertionError("linha ausente no Resumo: " + label + "\n" + csv));
    }

    private static BigDecimal number(String csv, String label) {
        return new BigDecimal(field(csv, label).replace(',', '.'));
    }

    private static BigDecimal money(JsonNode node) {
        return node.get("amount").decimalValue();
    }

    @Test
    @DisplayName("[CT-APR-18] a planilha fecha com o painel no mesmo recorte, inclusive o ticket medio")
    void spreadsheetAgreesWithThePanel() throws Exception {
        long allans = paidSale(fx.allan, 2);
        paidSale(fx.francisco, 1);
        jdbc.sql("INSERT INTO refund(payment_id, amount, reason, created_by) SELECT id, 20.00, 'Avaria', :m FROM payment WHERE order_id = :o")
                .param("m", fx.manager).param("o", allans).update();

        MvcResult panel = call(get("/management/revenue").param("period", "D7"), fx.manager);
        assertThat(panel.getResponse().getStatus()).isEqualTo(200);
        JsonNode report = json.readTree(panel.getResponse().getContentAsString());

        LocalDate today = StoreTime.today();
        String body = csv("from=" + today.minusDays(6) + "&to=" + today, fx.manager);

        // O painel e a planilha somam o mesmo recorte: toda medida do Resumo bate com a do relatorio.
        assertThat(number(body, "Receita das vendas (ja sem desconto)")).isEqualByComparingTo(money(report.get("grossRevenue")));
        assertThat(number(body, "Estornos")).isEqualByComparingTo(money(report.get("refunds")));
        assertThat(number(body, "Faturamento confirmado")).isEqualByComparingTo(money(report.get("netRevenue")));
        assertThat(number(body, "Pedidos pagos")).isEqualByComparingTo(BigDecimal.valueOf(report.get("ordersPaid").asLong()));
        // Guarda da reconciliacao: o ticket medio e o do painel (bruto / pedidos pagos). Neste recorte sao
        // 300,00 brutos em 2 pedidos pagos = 150,00; dividir o liquido (300,00 - 20,00 de estorno) daria
        // 140,00, e a planilha deixaria de fechar com a tela.
        assertThat(number(body, "Ticket medio por pedido")).isEqualByComparingTo(money(report.get("averageTicket")));
        assertThat(number(body, "Ticket medio por pedido")).isEqualByComparingTo("150.00");

        // E fecha consigo mesma: a soma das linhas de venda menos os estornos da o faturamento confirmado.
        BigDecimal soma = BigDecimal.ZERO;
        boolean naTabela = false;
        for (String line : body.split("\n")) {
            if (line.startsWith("Data;")) { naTabela = true; continue; }
            if (!naTabela || line.isBlank() || line.startsWith("Metas") || line.startsWith("Mes;")) continue;
            String[] cells = line.split(";");
            if (cells.length < 14) continue;
            soma = soma.add(new BigDecimal(cells[13].replace(',', '.')));
        }
        assertThat(soma).isEqualByComparingTo(number(body, "Faturamento confirmado"));
    }

    @Test
    @DisplayName("[CT-APR-19] com filtro de vendedor o Resumo diz por que nao compara, nao que falta meta")
    void filteredCutExplainsWhyItCannotCompareWithTheGoal() throws Exception {
        String month = YearMonth.from(StoreTime.today()).toString();
        MvcResult saved = call(put("/goals/monthly").contentType(MediaType.APPLICATION_JSON).content("""
                {"period":"%s","storeGoal":{"amount":100000.00,"currency":"BRL"},"sellers":[
                 {"sellerId":%d,"goal":{"amount":60000.00,"currency":"BRL"}},
                 {"sellerId":%d,"goal":{"amount":40000.00,"currency":"BRL"}}]}"""
                .formatted(month, fx.allan, fx.francisco)), fx.manager);
        assertThat(saved.getResponse().getStatus()).as(saved.getResponse().getContentAsString()).isEqualTo(200);
        paidSale(fx.allan, 2);

        YearMonth current = YearMonth.from(StoreTime.today());
        String whole = "from=" + current.atDay(1) + "&to=" + current.atEndOfMonth();

        // Mes inteiro e sem filtro: o plano aparece com o atingimento, sem motivo nenhum.
        String open = csv(whole, fx.manager);
        assertThat(number(open, "Plano da loja no periodo")).isEqualByComparingTo("100000.00");
        assertThat(field(open, "Atingimento do plano (%)")).isNotBlank();

        // Com filtro de vendedor as linhas de escopo "Loja" nao entram, e o plano do periodo fica zero. O
        // arquivo tem de dizer que o recorte esta filtrado — nunca que nenhum mes tem meta cadastrada, porque
        // a aba Metas do mesmo arquivo mostra a meta do vendedor.
        String filtered = csv(whole + "&seller=" + fx.allan, fx.manager);
        assertThat(field(filtered, "Meta do periodo")).contains("Nao comparavel").contains("filtrado");
        assertThat(filtered).doesNotContain("Nenhum mes do periodo tem meta cadastrada");
        assertThat(filtered).contains("60000,00");
    }
}
