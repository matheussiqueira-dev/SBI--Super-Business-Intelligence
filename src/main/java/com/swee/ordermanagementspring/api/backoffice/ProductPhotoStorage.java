package com.swee.ordermanagementspring.api.backoffice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;

/**
 * Armazenamento das fotos de produto (plano comercial, secao 05: arquivo em armazenamento de objetos privado,
 * chave no PostgreSQL).
 *
 * <p>A interface existe para o adaptador de producao (S3 ou compativel) entrar sem mexer no servico. O adaptador
 * entregue aqui grava em diretorio proprio do ambiente: ele e real, funciona no piloto com volume persistente e
 * nao depende de biblioteca nova. O que falta para o objeto ficar em nuvem esta registrado em
 * docs/05-operacao/fotos-de-produto.md.
 *
 * <p>O diretorio nunca fica dentro de uma pasta publica: os bytes so saem pela API, que confere a sessao antes.
 */
public interface ProductPhotoStorage {

    /** Grava o objeto e devolve a chave sorteada. */
    String put(byte[] content, String contentType);

    /** Bytes do objeto, ou vazio quando a chave nao existe mais (midia indisponivel). */
    Optional<byte[]> get(String key);

    /** Remove sem reclamar se ja nao existir. */
    void delete(String key);

    /** Adaptador de sistema de arquivos. */
    @Component
    class Filesystem implements ProductPhotoStorage {
        private static final Logger LOG = LoggerFactory.getLogger(Filesystem.class);
        private final Path root;

        public Filesystem(@Value("${sbi.product-photos.dir:${java.io.tmpdir}/sbi-fotos-produto}") String dir) {
            this.root = Path.of(dir).toAbsolutePath().normalize();
            try {
                Files.createDirectories(root);
            } catch (IOException error) {
                throw new UncheckedIOException("Nao foi possivel preparar o diretorio de fotos de produto.", error);
            }
            LOG.info("Fotos de produto em {}", root);
        }

        /** A chave e sorteada; o caminho e sempre montado a partir dela e conferido contra a raiz. */
        private Path resolve(String key) {
            Path path = root.resolve(key).normalize();
            if (!path.startsWith(root)) throw new IllegalArgumentException("Chave de foto invalida.");
            return path;
        }

        @Override
        public String put(byte[] content, String contentType) {
            String key = UUID.randomUUID() + "." + ProductPhotoImage.extension(contentType);
            Path target = resolve(key);
            try {
                // Grava ao lado e move: uma leitura concorrente nunca pega arquivo pela metade.
                Path temporary = Files.createTempFile(root, "upload-", ".part");
                try {
                    Files.write(temporary, content);
                    Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
                } catch (IOException error) {
                    Files.deleteIfExists(temporary);
                    throw error;
                }
            } catch (IOException error) {
                throw new UncheckedIOException("Nao foi possivel gravar a foto do produto.", error);
            }
            return key;
        }

        @Override
        public Optional<byte[]> get(String key) {
            try {
                return Optional.of(Files.readAllBytes(resolve(key)));
            } catch (NoSuchFileException | IllegalArgumentException missing) {
                return Optional.empty();
            } catch (IOException error) {
                throw new UncheckedIOException("Nao foi possivel ler a foto do produto.", error);
            }
        }

        @Override
        public void delete(String key) {
            try {
                Files.deleteIfExists(resolve(key));
            } catch (IOException | IllegalArgumentException error) {
                // Objeto orfao nao pode derrubar a troca de foto nem a exclusao do produto: fica o registro.
                LOG.warn("Foto de produto nao removida do armazenamento ({}): {}", key, error.getClass().getSimpleName());
            }
        }
    }
}
