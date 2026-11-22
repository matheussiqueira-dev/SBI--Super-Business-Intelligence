package com.swee.ordermanagementspring.api.backoffice;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;

/**
 * Conferencia do conteudo e miniatura da foto de produto (plano comercial, secao 05).
 *
 * <p>Sem dependencia nova: a decodificacao e a reducao usam o ImageIO do proprio JDK. Por isso o formato aceito
 * e JPEG ou PNG, os dois que todo JDK le e escreve. WebP e AVIF ficam para quando houver decisao sobre a
 * biblioteca; a tela diz quais formatos aceita.
 *
 * <p>O tipo declarado pelo navegador nao decide nada. A conferencia e em tres passos: os primeiros bytes do
 * arquivo, a decodificacao de verdade pelo ImageIO e os limites de tamanho. Um arquivo que se diz imagem mas nao
 * decodifica e recusado antes de chegar ao armazenamento.
 *
 * <p>A classe nao tem estado nem toca em disco, banco ou rede: o teste unitario exercita tudo sem subir Spring.
 */
public final class ProductPhotoImage {
    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";

    /** Lado maior da miniatura, em pixels. A tela mostra 40 px; 320 cobre telas densas e o painel de gestao. */
    public static final int THUMB_MAX_SIDE = 320;
    /** Limites da imagem original aceita. Acima disso a decodificacao gastaria memoria demais por requisicao. */
    public static final int MAX_SIDE = 4_096;
    public static final int MIN_SIDE = 64;

    private static final byte[] JPEG_MAGIC = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };
    private static final byte[] PNG_MAGIC = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };

    private ProductPhotoImage() { }

    /** Foto aceita: bytes originais, tipo confirmado, dimensoes e a miniatura ja gerada. */
    public record Checked(byte[] original, String contentType, int width, int height, byte[] thumbnail) { }

    /** Conteudo recusado, com o motivo que a tela mostra. O chamador transforma em 400. */
    public static final class RejectedException extends RuntimeException {
        public RejectedException(String message) {
            super(message);
        }
    }

    /** Tipo deduzido dos primeiros bytes; null quando nao e JPEG nem PNG. */
    public static String sniff(byte[] content) {
        if (content == null) return null;
        if (startsWith(content, JPEG_MAGIC)) return JPEG;
        if (startsWith(content, PNG_MAGIC)) return PNG;
        return null;
    }

    private static boolean startsWith(byte[] content, byte[] magic) {
        return content.length >= magic.length && Arrays.equals(content, 0, magic.length, magic, 0, magic.length);
    }

    /**
     * Confere o conteudo e gera a miniatura.
     *
     * @param content   bytes recebidos
     * @param maxBytes  tamanho maximo configurado
     * @throws RejectedException quando o arquivo nao e uma imagem JPEG ou PNG valida dentro dos limites
     */
    public static Checked check(byte[] content, long maxBytes) {
        if (content == null || content.length == 0) throw new RejectedException("Envie um arquivo de imagem.");
        if (content.length > maxBytes) {
            throw new RejectedException("A imagem passa do tamanho maximo de %d KB.".formatted(maxBytes / 1024));
        }
        String contentType = sniff(content);
        if (contentType == null) throw new RejectedException("Formato nao aceito. Envie JPEG ou PNG.");

        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(content));
        } catch (IOException | RuntimeException error) {
            // Arquivo truncado, cabecalho mentiroso ou imagem corrompida: nada vai para o armazenamento.
            throw new RejectedException("Nao foi possivel ler a imagem. Envie outro arquivo JPEG ou PNG.");
        }
        if (image == null) throw new RejectedException("Nao foi possivel ler a imagem. Envie outro arquivo JPEG ou PNG.");

        int width = image.getWidth();
        int height = image.getHeight();
        if (width < MIN_SIDE || height < MIN_SIDE) {
            throw new RejectedException("A imagem precisa ter pelo menos %d x %d pixels.".formatted(MIN_SIDE, MIN_SIDE));
        }
        if (width > MAX_SIDE || height > MAX_SIDE) {
            throw new RejectedException("A imagem passa de %d pixels de lado.".formatted(MAX_SIDE));
        }
        return new Checked(content, contentType, width, height, thumbnail(image, contentType));
    }

    /** Miniatura proporcional, no mesmo formato da original. Imagem ja pequena e reescrita no mesmo tamanho. */
    static byte[] thumbnail(BufferedImage source, String contentType) {
        int longest = Math.max(source.getWidth(), source.getHeight());
        double scale = longest <= THUMB_MAX_SIDE ? 1.0 : (double) THUMB_MAX_SIDE / longest;
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));

        // JPEG nao guarda transparencia: o alfa do PNG vira preto se a miniatura for gravada sem fundo.
        boolean jpeg = JPEG.equals(contentType);
        BufferedImage target = new BufferedImage(width, height, jpeg ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            if (jpeg) {
                graphics.setColor(java.awt.Color.WHITE);
                graphics.fillRect(0, 0, width, height);
            }
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            if (!ImageIO.write(target, jpeg ? "jpg" : "png", out)) {
                throw new RejectedException("Nao foi possivel gerar a miniatura desta imagem.");
            }
        } catch (IOException error) {
            throw new RejectedException("Nao foi possivel gerar a miniatura desta imagem.");
        }
        return out.toByteArray();
    }

    /** Extensao do objeto no armazenamento, para o arquivo continuar legivel fora do banco. */
    public static String extension(String contentType) {
        return JPEG.equals(contentType) ? "jpg" : "png";
    }
}
