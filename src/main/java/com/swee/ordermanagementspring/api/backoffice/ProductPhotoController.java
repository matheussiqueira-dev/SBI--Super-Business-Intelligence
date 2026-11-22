package com.swee.ordermanagementspring.api.backoffice;

import com.swee.ordermanagementspring.api.backoffice.BackofficeDtos.ProductPhoto;
import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.exceptions.ApiException;
import com.swee.ordermanagementspring.exceptions.ErrorResponse;
import com.swee.ordermanagementspring.security.AppPrincipal;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Foto do produto (plano comercial, secao 05).
 *
 * <p>Envio e remocao sao do GERENTE; a leitura e do VENDEDOR, que precisa da imagem no balcao. O arquivo vai em
 * multipart no campo "file" -- e o unico corpo nao-JSON da API, por isso fica em controlador proprio.
 *
 * <p>A resposta da imagem e sempre privada, para nenhuma CDN compartilhada guardar conteudo de loja, e leva o
 * validador da revisao entregue. Guardar por 30 dias vale so quando a URL fixa a revisao atual em `?rev=`.
 */
@RestController
public class ProductPhotoController {
    private final ProductPhotoService service;

    public ProductPhotoController(ProductPhotoService service) {
        this.service = service;
    }

    @GetMapping("/products/{id}/photo")
    @ApiResponse(responseCode = "200", description = "Metadados da foto do produto")
    @ApiResponse(responseCode = "404", description = "Produto sem foto",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ProductPhoto get(@PathVariable @Positive long id) {
        return service.get(id);
    }

    @PutMapping(path = "/products/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ApiResponse(responseCode = "200", description = "Foto gravada ou substituida")
    @ApiResponse(responseCode = "400", description = "Arquivo invalido, formato nao aceito ou tamanho acima do limite",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    public ProductPhoto upload(@AuthenticationPrincipal AppPrincipal principal, @PathVariable @Positive long id,
                               @RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) throw ApiException.badRequest("file: envie um arquivo de imagem");
        // O limite vale aqui tambem: o container ja barra corpo grande, mas a mensagem precisa ser a do contrato.
        if (file.getSize() > service.maxBytes()) {
            throw ApiException.badRequest("file: a imagem passa do tamanho maximo de %d KB".formatted(service.maxBytes() / 1024));
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException error) {
            throw ApiException.badRequest("file: nao foi possivel ler o arquivo enviado");
        }
        return service.save(CurrentUser.of(principal), id, content);
    }

    @DeleteMapping("/products/{id}/photo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppPrincipal principal, @PathVariable @Positive long id) {
        service.delete(CurrentUser.of(principal), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/products/{id}/photo/file")
    public ResponseEntity<byte[]> original(@PathVariable @Positive long id,
                                           @RequestParam(name = "rev", required = false) Integer rev,
                                           @RequestHeader(name = "If-None-Match", required = false) String ifNoneMatch) {
        return media(service.media(id, false), 'o', rev, ifNoneMatch);
    }

    @GetMapping("/products/{id}/photo/thumb")
    public ResponseEntity<byte[]> thumbnail(@PathVariable @Positive long id,
                                            @RequestParam(name = "rev", required = false) Integer rev,
                                            @RequestHeader(name = "If-None-Match", required = false) String ifNoneMatch) {
        return media(service.media(id, true), 't', rev, ifNoneMatch);
    }

    /**
     * Resposta da imagem, sempre privada e com validador da revisao servida.
     *
     * <p>O servico ja decidiu o papel e a existencia da midia antes de chegar aqui: nenhum 304 sai sem que a
     * autorizacao tenha passado e sem que o objeto exista de verdade no armazenamento.
     *
     * <p>Com `?rev=` igual a revisao atual, a resposta pode ser guardada por 30 dias e marcada immutable: a
     * revisao e inedita na instalacao (V14), entao aquela URL nunca vai responder outro conteudo. Sem `rev`, ou
     * com uma revisao que nao e mais a atual -- o caso de uma URL antiga que o navegador guardou --, a resposta
     * e no-cache com o validador do conteudo que esta sendo entregue: o navegador revalida e recebe a foto de
     * agora em vez de servir a de antes. O validador leva a variante (miniatura ou original), que sao dois
     * conteudos diferentes na mesma revisao.
     */
    private static ResponseEntity<byte[]> media(ProductPhotoService.Media media, char variant, Integer rev,
                                                String ifNoneMatch) {
        String etag = "\"r%d-%c\"".formatted(media.version(), variant);
        boolean pinned = rev != null && rev == media.version();
        CacheControl cache = pinned
                ? CacheControl.maxAge(java.time.Duration.ofDays(30)).cachePrivate().immutable()
                : CacheControl.noCache().cachePrivate();
        if (matches(ifNoneMatch, etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).cacheControl(cache).eTag(etag).build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .cacheControl(cache)
                .eTag(etag)
                .body(media.content());
    }

    /** If-None-Match aceita lista e prefixo W/; "*" vale porque aqui a midia existe. */
    private static boolean matches(String ifNoneMatch, String etag) {
        if (ifNoneMatch == null) return false;
        for (String candidate : ifNoneMatch.split(",")) {
            String tag = candidate.trim();
            if (tag.startsWith("W/")) tag = tag.substring(2);
            if ("*".equals(tag) || tag.equals(etag)) return true;
        }
        return false;
    }
}
