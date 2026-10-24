package com.swee.ordermanagementspring.api.executive;

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
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * [CT-EXEC-101 a CT-EXEC-104] Painel executivo do CEO (RF-27, RF-28): os fatos fecham com o faturamento do GERENTE,
 * o estorno fica em fato proprio, custo ausente nunca vira zero, equipes e metas vem no modelo e a meta anual e so do CEO.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Tag("integration")
class ExecutiveApiTest {

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate template;
    @Autowired JdbcClient jdbc;

    private final ObjectMapper json = new ObjectMapper();
    private MockMvc mvc;
    private PdvFixtures fx;
    private long ceo;
    private long mouse;
    private long cable;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        fx = new PdvFixtures(template, jdbc);
        ceo = jdbc.sql("INSERT INTO app_users(name, email, password_hash, role) VALUES ('Diretora', 'ceo@example.test', 'x', 'CEO') RETURNING id")
                .query(Long.class).single();
        mouse = fx.product("MOU-001", "Mouse", "100.00", 10, "60.00");
        cable = fx.product("CAB-001", "Cabo", "19.99", 5, null);
    }

    private MvcResult call(MockHttpServletRequestBuilder request, long actor) throws Exception {
        return mvc.perform(request.with(user(fx.principal(actor))).with(csrf())).andReturn();
    }

    private JsonNode ok(MvcResult result) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(200);
        return json.readTree(result.getResponse().getContentAsString());
    }

    private long paidSale(long seller, long product, int quantity, String payment) throws Exception {
        MvcResult created = call(post("/sales/orders").header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"customerId":%d,"items":[{"productId":%d,"quantity":%d}],"payment":%s,"fulfillment":"PICKUP"}"""
                        .formatted(fx.customer, product, quantity, payment)), seller);
        assertThat(created.getResponse().getStatus()).as(created.getResponse().getContentAsString()).isEqualTo(201);
        long order = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        assertThat(call(post("/sales/orders/" + order + "/payment"), seller).getResponse().getStatus()).isEqualTo(200);
        return order;
    }

    private static BigDecimal money(JsonNode node) {
        return node == null || node.isNull() ? null : node.get("amount").decimalValue();
    }

    private static BigDecimal sum(JsonNode rows, String field) {
        return StreamSupport.stream(rows.spliterator(), false).map(row -> money(row.get(field)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    @DisplayName("[CT-EXEC-101] fatos do painel fecham com o faturamento do GERENTE; estorno separado e custo ausente nulo")
    void overviewFactsMatchTheManagerRevenue() throws Exception {
        long allans = paidSale(fx.allan, mouse, 2, "{\"type\":\"PIX\"}");
        paidSale(fx.francisco, cable, 1, "{\"type\":\"CARD\",\"cardLast4\":\"1234\",\"installments\":1}");
        call(post("/sales/orders").header("Idempotency-Key", UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":%d,\"items\":[{\"productId\":%d,\"quantity\":1}],\"payment\":{\"type\":\"PIX\"},\"fulfillment\":\"PICKUP\"}"
                        .formatted(fx.customer, mouse)), fx.allan);                      // pendente: fora dos fatos
        jdbc.sql("INSERT INTO refund(payment_id, amount, reason, created_by) SELECT id, 20.00, 'Avaria', :m FROM payment WHERE order_id = :o")
                .param("m", fx.manager).param("o", allans).update();
        fx.set("UPDATE app_users SET manager_id = ? WHERE id = ?", fx.manager, fx.allan);

        int year = StoreTime.today().getYear();
        JsonNode model = ok(call(get("/executive/overview").param("year", String.valueOf(year)), ceo));
        assertThat(model.get("year").asInt()).isEqualTo(year);
        assertThat(model.get("today").asText()).isEqualTo(StoreTime.today().toString());
        assertThat(model.get("from").asText()).isEqualTo(LocalDate.of(year - 1, 1, 1).toString());
        assertThat(model.get("to").asText()).isEqualTo(LocalDate.of(year, 12, 31).toString());

        JsonNode sales = model.get("sales");
        assertThat(sales).hasSize(2);
        assertThat(sum(sales, "netRevenue")).isEqualByComparingTo("219.99");
        assertThat(sum(model.get("refunds"), "amount")).isEqualByComparingTo("20.00");
        JsonNode mouseItem = StreamSupport.stream(sales.spliterator(), false)
                .filter(row -> row.get("productId").asLong() == mouse).findFirst().orElseThrow();
        assertThat(mouseItem.get("units").asInt()).isEqualTo(2);
        assertThat(money(mouseItem.get("cost"))).isEqualByComparingTo("120.00");
        assertThat(mouseItem.get("paymentMethod").asText()).isEqualTo("PIX");
        assertThat(mouseItem.get("sellerId").asLong()).isEqualTo(fx.allan);
        JsonNode cableItem = StreamSupport.stream(sales.spliterator(), false)
                .filter(row -> row.get("productId").asLong() == cable).findFirst().orElseThrow();
        assertThat(cableItem.get("cost").isNull()).isTrue();

        // Mesmo numero do GERENTE: liquido = vendas - estornos.
        JsonNode revenue = ok(call(get("/management/revenue").param("period", "D7"), fx.manager));
        assertThat(sum(sales, "netRevenue").subtract(sum(model.get("refunds"), "amount")))
                .isEqualByComparingTo(money(revenue.get("netRevenue")));

        JsonNode allan = StreamSupport.stream(model.get("people").spliterator(), false)
                .filter(person -> person.get("id").asLong() == fx.allan).findFirst().orElseThrow();
        assertThat(allan.get("managerId").asLong()).isEqualTo(fx.manager);
        assertThat(model.get("people").get(0).get("role").asText()).isEqualTo("CEO");
        JsonNode mouseProduct = StreamSupport.stream(model.get("products").spliterator(), false)
                .filter(product -> product.get("id").asLong() == mouse).findFirst().orElseThrow();
        assertThat(money(mouseProduct.get("price"))).isEqualByComparingTo("100.00");
        assertThat(money(mouseProduct.get("averageCost"))).isEqualByComparingTo("60.00");
        assertThat(model.get("annualGoal").isNull()).isTrue();
    }

    @Test
    @DisplayName("[CT-EXEC-102] metas mensais do ano entram no modelo; o CEO grava a meta do mes pela hierarquia")
    void overviewCarriesMonthlyGoals() throws Exception {
        String month = YearMonth.from(StoreTime.today()).toString();
        MvcResult saved = call(put("/goals/monthly").contentType(MediaType.APPLICATION_JSON).content("""
                {"period":"%s","storeGoal":{"amount":3000.00,"currency":"BRL"},"sellers":[
                  {"sellerId":%d,"goal":{"amount":1000.00,"currency":"BRL"}},
                  {"sellerId":%d,"goal":{"amount":2000.00,"currency":"BRL"}}]}""".formatted(month, fx.allan, fx.francisco)), ceo);
        ok(saved);
        JsonNode model = ok(call(get("/executive/overview").param("year", month.substring(0, 4)), ceo));
        JsonNode goal = model.get("monthlyGoals").get(0);
        assertThat(goal.get("period").asText()).isEqualTo(month);
        assertThat(money(goal.get("storeGoal"))).isEqualByComparingTo("3000.00");
        assertThat(goal.get("sellers")).hasSize(2);
        assertThat(sum(goal.get("sellers"), "goal")).isEqualByComparingTo("3000.00");
    }

    @Test
    @DisplayName("[CT-EXEC-103] meta anual: CEO grava e substitui, com auditoria; valor e ano invalidos -> 400")
    void annualGoalIsSavedByTheCeo() throws Exception {
        String body = "{\"year\":2026,\"amount\":{\"amount\":%s,\"currency\":\"BRL\"}}";
        JsonNode first = ok(call(put("/executive/goals/annual").contentType(MediaType.APPLICATION_JSON).content(body.formatted("2400000.00")), ceo));
        assertThat(money(first.get("amount"))).isEqualByComparingTo("2400000.00");
        assertThat(first.get("updatedBy").get("id").asLong()).isEqualTo(ceo);
        JsonNode second = ok(call(put("/executive/goals/annual").contentType(MediaType.APPLICATION_JSON).content(body.formatted("2600000.00")), ceo));
        assertThat(money(second.get("amount"))).isEqualByComparingTo("2600000.00");
        assertThat(money(ok(call(get("/executive/overview").param("year", "2026"), ceo)).get("annualGoal").get("amount")))
                .isEqualByComparingTo("2600000.00");
        assertThat(jdbc.sql("SELECT count(*) FROM audit_event WHERE action = 'ANNUAL_GOAL_SAVED'").query(Long.class).single()).isEqualTo(2);

        assertThat(call(put("/executive/goals/annual").contentType(MediaType.APPLICATION_JSON)
                .content("{\"year\":1999,\"amount\":{\"amount\":1.00,\"currency\":\"BRL\"}}"), ceo).getResponse().getStatus()).isEqualTo(400);
        assertThat(call(put("/executive/goals/annual").contentType(MediaType.APPLICATION_JSON)
                .content(body.formatted("-1.00")), ceo).getResponse().getStatus()).isEqualTo(400);
        assertThat(call(get("/executive/overview").param("year", "1999"), ceo).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("[CT-EXEC-104] GERENTE e VENDEDOR recebem 403 no painel executivo e na meta anual")
    void onlyTheCeoReachesTheExecutiveArea() throws Exception {
        for (long actor : new long[] {fx.manager, fx.allan}) {
            assertThat(call(get("/executive/overview").param("year", "2026"), actor).getResponse().getStatus()).isEqualTo(403);
            assertThat(call(put("/executive/goals/annual").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"year\":2026,\"amount\":{\"amount\":1.00,\"currency\":\"BRL\"}}"), actor).getResponse().getStatus())
                    .isEqualTo(403);
        }
        assertThat(jdbc.sql("SELECT count(*) FROM annual_goal").query(Long.class).single()).isZero();
    }
}
