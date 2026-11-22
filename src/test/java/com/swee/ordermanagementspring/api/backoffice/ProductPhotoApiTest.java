package com.swee.ordermanagementspring.api.backoffice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swee.ordermanagementspring.support.PdvFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * Ciclo de vida da foto de produto pela API (CT-FOTO-12x): envio, troca, remocao e reenvio, com a revisao, a URL
 * e o validador de cache que cada publicacao entrega.
 *
 * <p>O que estes testes travam: a revisao e inedita na instalacao (V14), entao remover a foto e enviar outra nao
 * repete numero -- era assim que duas fotos diferentes do mesmo produto ganhavam a mesma URL (?v=1) e o mesmo
 * validador ("v1") com 30 dias de cache, e o navegador podia continuar mostrando a antiga.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Tag("integration")
@DisplayName("Foto de produto: ciclo de vida, revisao e cache")
class ProductPhotoApiTest {

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate template;
    @Autowired JdbcClient jdbc;

    private final ObjectMapper json = new ObjectMapper();
    private MockMvc mvc;
    private PdvFixtures fx;
    private long product;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        fx = new PdvFixtures(template, jdbc);
        product = fx.product("FOTO-001", "Fone sintetico", "59.90", 5, "30.00");
    }

    /** Imagem valida e distinta por cor: bytes diferentes para provar que o conteudo servido mudou. */
    private static byte[] png(Color color, int side) throws IOException {
        BufferedImage source = new BufferedImage(side, side, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = source.createGraphics();
        graphics.setColor(color);
        graphics.fillRect(0, 0, side, side);
        graphics.setColor(Color.WHITE);
        graphics.fillOval(side / 4, side / 4, side / 2, side / 2);
        graphics.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(source, "png", out);
        return out.toByteArray();
    }

    private MvcResult upload(byte[] content, long actor) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", content);
        return mvc.perform(multipart(HttpMethod.PUT, "/products/{id}/photo", product).file(file)
                .with(user(fx.principal(actor))).with(csrf())).andReturn();
    }

    private int publish(byte[] content) throws Exception {
        MvcResult result = upload(content, fx.manager);
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(200);
        return json.readTree(result.getResponse().getContentAsString()).get("version").asInt();
    }

    private MvcResult read(String variant, Integer rev, String ifNoneMatch) throws Exception {
        var request = get("/products/{id}/photo/{variant}", product, variant);
        if (rev != null) request = request.param("rev", String.valueOf(rev));
        if (ifNoneMatch != null) request = request.header("If-None-Match", ifNoneMatch);
        return mvc.perform(request.with(user(fx.principal(fx.manager)))).andReturn();
    }

    private JsonNode metadata() throws Exception {
        MvcResult result = mvc.perform(get("/products/{id}/photo", product).with(user(fx.principal(fx.manager)))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return json.readTree(result.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("[CT-FOTO-120] a publicacao devolve revisao, e a URL com a revisao atual pode ser guardada")
    void publishesWithPinnedCache() throws Exception {
        int revision = publish(png(Color.BLUE, 400));
        assertThat(revision).isPositive();
        assertThat(metadata().get("version").asInt()).isEqualTo(revision);

        MvcResult thumb = read("thumb", revision, null);
        assertThat(thumb.getResponse().getStatus()).isEqualTo(200);
        assertThat(thumb.getResponse().getContentAsByteArray()).isNotEmpty();
        assertThat(thumb.getResponse().getContentType()).startsWith("image/png");
        assertThat(thumb.getResponse().getHeader("ETag")).isEqualTo("\"r%d-t\"".formatted(revision));
        assertThat(thumb.getResponse().getHeader("Cache-Control")).contains("private").contains("max-age=2592000")
                .contains("immutable");

        // O original e outro conteudo na mesma revisao: o validador precisa separar as duas variantes.
        MvcResult file = read("file", revision, null);
        assertThat(file.getResponse().getHeader("ETag")).isEqualTo("\"r%d-o\"".formatted(revision));
        assertThat(file.getResponse().getContentAsByteArray()).isNotEqualTo(thumb.getResponse().getContentAsByteArray());

        // Sem revisao na URL nao da para guardar por 30 dias: o conteudo daquele endereco muda na proxima troca.
        assertThat(read("thumb", null, null).getResponse().getHeader("Cache-Control"))
                .contains("no-cache").contains("private").doesNotContain("max-age=2592000");

        // O campo do produto acompanha a revisao: e dele que a listagem monta a URL da miniatura.
        MvcResult show = mvc.perform(get("/products/{id}", product).with(user(fx.principal(fx.manager)))).andReturn();
        assertThat(json.readTree(show.getResponse().getContentAsString()).get("photoVersion").asInt()).isEqualTo(revision);
    }

    @Test
    @DisplayName("[CT-FOTO-121] a troca muda revisao e conteudo, e a URL da revisao antiga nao serve a foto antiga")
    void replacementInvalidatesTheOldUrl() throws Exception {
        int first = publish(png(Color.BLUE, 400));
        byte[] before = read("thumb", first, null).getResponse().getContentAsByteArray();

        int second = publish(png(Color.RED, 600));
        assertThat(second).isGreaterThan(first);

        byte[] after = read("thumb", second, null).getResponse().getContentAsByteArray();
        assertThat(after).isNotEqualTo(before);

        // Quem esta com a URL antiga aberta recebe o conteudo de agora, com o validador de agora e sem permissao
        // para guardar: a resposta nunca mente sobre o que entregou.
        MvcResult stale = read("thumb", first, null);
        assertThat(stale.getResponse().getStatus()).isEqualTo(200);
        assertThat(stale.getResponse().getContentAsByteArray()).isEqualTo(after);
        assertThat(stale.getResponse().getHeader("ETag")).isEqualTo("\"r%d-t\"".formatted(second));
        assertThat(stale.getResponse().getHeader("Cache-Control")).contains("no-cache").doesNotContain("immutable");
    }

    @Test
    @DisplayName("[CT-FOTO-122] remover e enviar de novo nunca repete uma revisao")
    void revisionIsNeverReused() throws Exception {
        List<Integer> seen = new ArrayList<>();
        seen.add(publish(png(Color.BLUE, 400)));
        seen.add(publish(png(Color.GREEN, 420)));

        MvcResult removed = mvc.perform(delete("/products/{id}/photo", product)
                .with(user(fx.principal(fx.manager))).with(csrf())).andReturn();
        assertThat(removed.getResponse().getStatus()).isEqualTo(204);
        assertThat(read("thumb", seen.get(1), null).getResponse().getStatus()).isEqualTo(404);

        seen.add(publish(png(Color.ORANGE, 440)));
        assertThat(seen).doesNotHaveDuplicates();
        assertThat(seen.get(2)).as("a revisao depois da remocao nao volta para tras").isGreaterThan(seen.get(1));
        assertThat(read("thumb", seen.get(2), null).getResponse().getHeader("ETag"))
                .isNotEqualTo("\"r%d-t\"".formatted(seen.get(0)));
    }

    @Test
    @DisplayName("[CT-FOTO-123] o validador atual responde 304; o de uma revisao antiga responde a foto de agora")
    void conditionalRequests() throws Exception {
        int revision = publish(png(Color.BLUE, 400));
        String current = "\"r%d-t\"".formatted(revision);

        assertThat(read("thumb", revision, current).getResponse().getStatus()).isEqualTo(304);
        assertThat(read("thumb", revision, "W/" + current).getResponse().getStatus()).isEqualTo(304);
        assertThat(read("thumb", revision, "\"r999999-t\", " + current).getResponse().getStatus()).isEqualTo(304);

        int next = publish(png(Color.RED, 600));
        MvcResult stale = read("thumb", revision, current);
        assertThat(stale.getResponse().getStatus()).as("validador antigo nao pode render 304").isEqualTo(200);
        assertThat(stale.getResponse().getHeader("ETag")).isEqualTo("\"r%d-t\"".formatted(next));
    }

    @Test
    @DisplayName("[CT-FOTO-124] envio invalido responde 400 e a foto que estava publicada continua servindo")
    void invalidUploadKeepsThePublishedPhoto() throws Exception {
        int revision = publish(png(Color.BLUE, 400));
        byte[] published = read("thumb", revision, null).getResponse().getContentAsByteArray();

        MvcResult rejected = upload("nao e imagem nenhuma".getBytes(StandardCharsets.UTF_8), fx.manager);
        assertThat(rejected.getResponse().getStatus()).isEqualTo(400);

        assertThat(metadata().get("version").asInt()).isEqualTo(revision);
        assertThat(read("thumb", revision, null).getResponse().getContentAsByteArray()).isEqualTo(published);
    }

    @Test
    @DisplayName("[CT-FOTO-125] midia que nao esta no armazenamento responde 404, para a tela cair no fallback")
    void missingMediaFallsBack() throws Exception {
        int revision = publish(png(Color.BLUE, 400));
        template.update("UPDATE product_photo SET thumb_key = ? WHERE product_id = ?", "objeto-que-nao-existe", product);

        assertThat(read("thumb", revision, null).getResponse().getStatus()).isEqualTo(404);
        // O original continua la: a queda e por variante, nao apaga a foto do catalogo.
        assertThat(read("file", revision, null).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("[CT-FOTO-126] vendedor le a foto no balcao e nao publica")
    void sellerReadsButDoesNotPublish() throws Exception {
        int revision = publish(png(Color.BLUE, 400));

        MvcResult read = mvc.perform(get("/products/{id}/photo/thumb", product).param("rev", String.valueOf(revision))
                .with(user(fx.principal(fx.allan)))).andReturn();
        assertThat(read.getResponse().getStatus()).isEqualTo(200);

        assertThat(upload(png(Color.RED, 400), fx.allan).getResponse().getStatus()).isEqualTo(403);
        assertThat(metadata().get("version").asInt()).as("a tentativa do vendedor nao mexe na foto").isEqualTo(revision);
    }
}
