package com.swee.ordermanagementspring.api.backoffice;

import com.swee.ordermanagementspring.api.backoffice.BackofficeDtos.ProductPhoto;
import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.common.DbSessionContext;
import com.swee.ordermanagementspring.entities.audit.AuditAction;
import com.swee.ordermanagementspring.exceptions.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Foto do produto mantida pela loja (plano comercial, secao 05).
 *
 * <p>Ordem das escritas na troca: o objeto novo e gravado primeiro, a linha e atualizada depois e o objeto antigo
 * so sai quando a transacao confirma. Assim a foto antiga continua servindo ate a troca terminar, e uma falha
 * entre a gravacao e a atualizacao deixa, no pior caso, um objeto orfao -- nunca um produto apontando para um
 * objeto que nao existe.
 *
 * <p>Envio e remocao seguram a linha do produto (SELECT ... FOR UPDATE, como em CatalogAdminService): duas
 * operacoes no mesmo produto entram em fila, entao cada uma ve a chave que de fato substituiu e remove essa --
 * nunca uma midia que a outra acabou de publicar.
 *
 * <p>A revisao vem da sequencia da V14, nao de um contador por produto: nenhuma publicacao reaproveita um
 * numero, nem depois de uma remocao, e por isso a URL e o validador de uma foto nova nunca colidem com os de
 * uma foto antiga que o navegador ainda tenha em cache.
 *
 * <p>A leitura e liberada para o VENDEDOR, que precisa da foto no balcao; a escrita exige GERENTE na URL
 * (SecurityConfig), no servico (@PreAuthorize) e no banco (gatilho da V13).
 */
@Service
public class ProductPhotoService {
    private static final Logger LOG = LoggerFactory.getLogger(ProductPhotoService.class);

    private final JdbcClient jdbc;
    private final DbSessionContext session;
    private final ProductPhotoStorage storage;
    private final com.swee.ordermanagementspring.security.AuditService audit;
    private final long maxBytes;

    public ProductPhotoService(JdbcClient jdbc, DbSessionContext session, ProductPhotoStorage storage,
                               com.swee.ordermanagementspring.security.AuditService audit,
                               @Value("${sbi.product-photos.max-bytes:3145728}") long maxBytes) {
        this.jdbc = jdbc;
        this.session = session;
        this.storage = storage;
        this.audit = audit;
        this.maxBytes = maxBytes;
    }

    public long maxBytes() {
        return maxBytes;
    }

    /** Bytes guardados, com o tipo, para a resposta da imagem. */
    public record Media(byte[] content, String contentType, int version) { }

    private void requireProduct(long productId) {
        Integer found = jdbc.sql("SELECT 1 FROM product WHERE id = :id").param("id", productId)
                .query(Integer.class).optional().orElse(null);
        if (found == null) throw ApiException.notFound("Product not found, id: " + productId);
    }

    /**
     * Mesma conferencia do requireProduct, segurando a linha do produto ate o commit. As escritas da foto
     * passam por aqui: a fila por produto vale tambem para o primeiro envio, quando ainda nao existe linha em
     * product_photo para travar.
     */
    private void lockProduct(long productId) {
        Long found = jdbc.sql("SELECT id FROM product WHERE id = :id FOR UPDATE").param("id", productId)
                .query(Long.class).optional().orElse(null);
        if (found == null) throw ApiException.notFound("Product not found, id: " + productId);
    }

    private Optional<ProductPhoto> read(long productId) {
        return jdbc.sql("""
                        SELECT product_id, content_type, byte_size, width, height, version, uploaded_at
                          FROM product_photo WHERE product_id = :id""")
                .param("id", productId)
                .query((rs, row) -> new ProductPhoto(rs.getLong("product_id"), rs.getString("content_type"),
                        rs.getInt("byte_size"), rs.getInt("width"), rs.getInt("height"), rs.getInt("version"),
                        rs.getObject("uploaded_at", OffsetDateTime.class)))
                .optional();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('VENDEDOR')")
    public ProductPhoto get(long productId) {
        requireProduct(productId);
        return read(productId).orElseThrow(() -> ApiException.notFound("Product photo not found, product: " + productId));
    }

    /**
     * Bytes da foto ou da miniatura. Objeto ausente no armazenamento responde 404 em vez de 500: a aplicacao
     * mostra o recurso de queda (mapa local e, na falta dele, o icone da linha) quando a midia nao esta la.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('VENDEDOR')")
    public Media media(long productId, boolean thumbnail) {
        record Keys(String storageKey, String thumbKey, String contentType, int version) { }
        Keys keys = jdbc.sql("SELECT storage_key, thumb_key, content_type, version FROM product_photo WHERE product_id = :id")
                .param("id", productId)
                .query((rs, row) -> new Keys(rs.getString("storage_key"), rs.getString("thumb_key"),
                        rs.getString("content_type"), rs.getInt("version")))
                .optional()
                .orElseThrow(() -> ApiException.notFound("Product photo not found, product: " + productId));
        String key = thumbnail ? keys.thumbKey() : keys.storageKey();
        byte[] content = storage.get(key).orElseThrow(() -> {
            LOG.warn("Foto do produto {} sem objeto no armazenamento ({})", productId, thumbnail ? "miniatura" : "original");
            return ApiException.notFound("Product photo media not available, product: " + productId);
        });
        return new Media(content, keys.contentType(), keys.version());
    }

    /**
     * Grava ou substitui a foto. Conteudo invalido vira 400 antes de qualquer escrita.
     */
    @Transactional
    @PreAuthorize("hasRole('GERENTE')")
    public ProductPhoto save(CurrentUser user, long productId, byte[] content) {
        lockProduct(productId);
        ProductPhotoImage.Checked checked;
        try {
            checked = ProductPhotoImage.check(content, maxBytes);
        } catch (ProductPhotoImage.RejectedException rejected) {
            throw ApiException.badRequest(rejected.getMessage());
        }
        session.apply(user.id(), "foto do produto");

        record Old(String storageKey, String thumbKey) { }
        Old old = jdbc.sql("SELECT storage_key, thumb_key FROM product_photo WHERE product_id = :id")
                .param("id", productId)
                .query((rs, row) -> new Old(rs.getString("storage_key"), rs.getString("thumb_key")))
                .optional().orElse(null);

        // Revisao inedita (V14). A sequencia nao volta atras num rollback, e e exatamente isso que se quer: um
        // numero queimado nunca reaparece numa URL com conteudo diferente.
        int revision = jdbc.sql("SELECT nextval('product_photo_version_seq')").query(Integer.class).single();

        String storageKey = storage.put(checked.original(), checked.contentType());
        String thumbKey = storage.put(checked.thumbnail(), checked.contentType());
        // A transacao pode falhar depois daqui (gatilho do banco, conexao): os objetos novos sairiam orfaos.
        afterRollback(() -> {
            storage.delete(storageKey);
            storage.delete(thumbKey);
        });

        jdbc.sql("""
                INSERT INTO product_photo (product_id, storage_key, thumb_key, content_type, byte_size, width, height,
                                           version, uploaded_by, uploaded_at)
                VALUES (:id, :key, :thumb, :type, :size, :width, :height, :revision, :user, now())
                ON CONFLICT (product_id) DO UPDATE SET
                    storage_key = EXCLUDED.storage_key, thumb_key = EXCLUDED.thumb_key,
                    content_type = EXCLUDED.content_type, byte_size = EXCLUDED.byte_size,
                    width = EXCLUDED.width, height = EXCLUDED.height,
                    version = EXCLUDED.version, uploaded_by = EXCLUDED.uploaded_by, uploaded_at = now()""")
                .param("id", productId).param("key", storageKey).param("thumb", thumbKey)
                .param("type", checked.contentType()).param("size", checked.original().length)
                .param("width", checked.width()).param("height", checked.height())
                .param("revision", revision).param("user", user.id())
                .update();

        // A foto antiga so sai depois do commit: ate la ela continua respondendo a quem esta com a tela aberta.
        if (old != null) {
            afterCommit(() -> {
                storage.delete(old.storageKey());
                storage.delete(old.thumbKey());
            });
        }

        ProductPhoto saved = read(productId).orElseThrow();
        audit.record(AuditAction.PRODUCT_PHOTO_CHANGED, user.id(), "product_photo", productId,
                "{\"version\":%d,\"bytes\":%d}".formatted(saved.version(), saved.byteSize()));
        return saved;
    }

    @Transactional
    @PreAuthorize("hasRole('GERENTE')")
    public void delete(CurrentUser user, long productId) {
        lockProduct(productId);
        record Keys(String storageKey, String thumbKey) { }
        Keys keys = jdbc.sql("SELECT storage_key, thumb_key FROM product_photo WHERE product_id = :id")
                .param("id", productId)
                .query((rs, row) -> new Keys(rs.getString("storage_key"), rs.getString("thumb_key")))
                .optional()
                .orElseThrow(() -> ApiException.notFound("Product photo not found, product: " + productId));
        session.apply(user.id(), "remocao da foto do produto");
        jdbc.sql("DELETE FROM product_photo WHERE product_id = :id").param("id", productId).update();
        afterCommit(() -> {
            storage.delete(keys.storageKey());
            storage.delete(keys.thumbKey());
        });
        audit.record(AuditAction.PRODUCT_PHOTO_REMOVED, user.id(), "product_photo", productId, null);
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private static void afterRollback(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) action.run();
            }
        });
    }
}
