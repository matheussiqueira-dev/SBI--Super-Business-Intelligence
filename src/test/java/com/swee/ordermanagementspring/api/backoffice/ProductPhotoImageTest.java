package com.swee.ordermanagementspring.api.backoffice;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Conferencia do conteudo e da miniatura da foto de produto (CT-FOTO-1xx). Sem Spring e sem banco: so a regra.
 */
@DisplayName("Foto de produto: conteudo e miniatura")
class ProductPhotoImageTest {

    private static final long MAX = 3L * 1024 * 1024;

    private static byte[] image(String format, int width, int height) throws IOException {
        boolean jpeg = "jpg".equals(format);
        BufferedImage source = new BufferedImage(width, height, jpeg ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = source.createGraphics();
        graphics.setColor(Color.BLUE);
        graphics.fillRect(0, 0, width, height);
        graphics.setColor(Color.ORANGE);
        graphics.fillOval(width / 4, height / 4, width / 2, height / 2);
        graphics.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(source, format, out);
        return out.toByteArray();
    }

    @Test
    @DisplayName("[CT-FOTO-101] o tipo vem dos bytes do arquivo, nao do que o navegador declara")
    void sniffsContentType() throws IOException {
        assertThat(ProductPhotoImage.sniff(image("jpg", 200, 200))).isEqualTo(ProductPhotoImage.JPEG);
        assertThat(ProductPhotoImage.sniff(image("png", 200, 200))).isEqualTo(ProductPhotoImage.PNG);
        assertThat(ProductPhotoImage.sniff("GIF89a qualquer coisa".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(ProductPhotoImage.sniff(new byte[] { 1, 2 })).isNull();
        assertThat(ProductPhotoImage.sniff(null)).isNull();
    }

    @Test
    @DisplayName("[CT-FOTO-102] JPEG e PNG validos passam e saem com miniatura no mesmo formato")
    void acceptsValidImages() throws IOException {
        for (String format : new String[] { "jpg", "png" }) {
            ProductPhotoImage.Checked checked = ProductPhotoImage.check(image(format, 1200, 900), MAX);
            assertThat(checked.width()).isEqualTo(1200);
            assertThat(checked.height()).isEqualTo(900);
            assertThat(checked.contentType()).isEqualTo("jpg".equals(format) ? ProductPhotoImage.JPEG : ProductPhotoImage.PNG);
            assertThat(ProductPhotoImage.sniff(checked.thumbnail()))
                    .as("miniatura no mesmo formato da original (%s)", format)
                    .isEqualTo(checked.contentType());

            BufferedImage thumb = ImageIO.read(new ByteArrayInputStream(checked.thumbnail()));
            assertThat(Math.max(thumb.getWidth(), thumb.getHeight())).isEqualTo(ProductPhotoImage.THUMB_MAX_SIDE);
            // Proporcao preservada: 1200x900 -> 320x240.
            assertThat(thumb.getWidth()).isEqualTo(320);
            assertThat(thumb.getHeight()).isEqualTo(240);
            assertThat(checked.thumbnail().length).isLessThan(checked.original().length);
        }
    }

    @Test
    @DisplayName("[CT-FOTO-103] arquivo que nao e imagem e recusado antes de qualquer gravacao")
    void rejectsNonImage() {
        byte[] text = "nao sou uma imagem, sou um texto qualquer".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> ProductPhotoImage.check(text, MAX))
                .isInstanceOf(ProductPhotoImage.RejectedException.class)
                .hasMessageContaining("JPEG ou PNG");

        assertThatThrownBy(() -> ProductPhotoImage.check(new byte[0], MAX))
                .isInstanceOf(ProductPhotoImage.RejectedException.class);
        assertThatThrownBy(() -> ProductPhotoImage.check(null, MAX))
                .isInstanceOf(ProductPhotoImage.RejectedException.class);
    }

    @Test
    @DisplayName("[CT-FOTO-104] cabecalho de imagem com corpo quebrado nao vira foto")
    void rejectsTruncatedImage() throws IOException {
        byte[] whole = image("png", 400, 400);
        byte[] truncated = Arrays.copyOf(whole, 40);
        assertThat(ProductPhotoImage.sniff(truncated)).isEqualTo(ProductPhotoImage.PNG);
        assertThatThrownBy(() -> ProductPhotoImage.check(truncated, MAX))
                .as("os bytes iniciais dizem PNG, mas a imagem nao decodifica")
                .isInstanceOf(ProductPhotoImage.RejectedException.class)
                .hasMessageContaining("Nao foi possivel ler a imagem");
    }

    @Test
    @DisplayName("[CT-FOTO-105] limites de tamanho em bytes e em pixels")
    void rejectsOutOfLimits() throws IOException {
        byte[] photo = image("jpg", 800, 600);
        assertThatThrownBy(() -> ProductPhotoImage.check(photo, photo.length - 1L))
                .isInstanceOf(ProductPhotoImage.RejectedException.class)
                .hasMessageContaining("tamanho maximo");

        byte[] tiny = image("png", ProductPhotoImage.MIN_SIDE - 1, ProductPhotoImage.MIN_SIDE - 1);
        assertThatThrownBy(() -> ProductPhotoImage.check(tiny, MAX))
                .isInstanceOf(ProductPhotoImage.RejectedException.class)
                .hasMessageContaining("pelo menos");

        // No limite exato os dois extremos passam.
        assertThat(ProductPhotoImage.check(photo, photo.length).width()).isEqualTo(800);
        assertThat(ProductPhotoImage.check(image("png", ProductPhotoImage.MIN_SIDE, ProductPhotoImage.MIN_SIDE), MAX).width())
                .isEqualTo(ProductPhotoImage.MIN_SIDE);
    }

    @Test
    @DisplayName("[CT-FOTO-106] imagem menor que a miniatura nao e ampliada")
    void doesNotUpscale() throws IOException {
        ProductPhotoImage.Checked checked = ProductPhotoImage.check(image("png", 100, 80), MAX);
        BufferedImage thumb = ImageIO.read(new ByteArrayInputStream(checked.thumbnail()));
        assertThat(thumb.getWidth()).isEqualTo(100);
        assertThat(thumb.getHeight()).isEqualTo(80);
    }

    @Test
    @DisplayName("[CT-FOTO-107] a extensao do objeto acompanha o tipo confirmado")
    void extensionFollowsContentType() {
        assertThat(ProductPhotoImage.extension(ProductPhotoImage.JPEG)).isEqualTo("jpg");
        assertThat(ProductPhotoImage.extension(ProductPhotoImage.PNG)).isEqualTo("png");
    }
}
