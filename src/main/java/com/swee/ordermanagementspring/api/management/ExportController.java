package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportFilters;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportFormat;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportModel;
import com.swee.ordermanagementspring.api.management.ManagementDtos.DateRange;
import com.swee.ordermanagementspring.exceptions.ApiException;
import com.swee.ordermanagementspring.security.AppPrincipal;
import jakarta.validation.constraints.Pattern;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Exportacao do recorte de analises em Excel (.xlsx e .xls real) e CSV (D-EVO-55).
 * Fica sob /analytics/**, por isso o SecurityConfig ja a restringe a GERENTE e, pela hierarquia, CEO:
 * o escopo autorizado e decidido no servidor, nao no navegador, e a tela nao consegue ampliar o recorte.
 */
@RestController
public class ExportController {

    /** Janela maxima de um pedido de exportacao, em dias. Protege o servidor e o limite do .xls. */
    static final long MAX_DAYS = 732;

    private final ExportService service;
    private final SpreadsheetWriter writer;

    public ExportController(ExportService service, SpreadsheetWriter writer) {
        this.service = service;
        this.writer = writer;
    }

    @GetMapping("/analytics/export")
    public ResponseEntity<Resource> export(
            @AuthenticationPrincipal AppPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "XLSX") ExportFormat format,
            @RequestParam(required = false) Long seller,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) @Pattern(regexp = "CARD|PIX|BOLETO") String payment) {

        if (to.isBefore(from)) {
            throw ApiException.badRequest("O periodo final nao pode ser anterior ao inicial.");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
            throw ApiException.badRequest("O periodo da exportacao nao pode passar de " + MAX_DAYS + " dias.");
        }

        ExportModel model = service.model(CurrentUser.of(principal), new DateRange(from, to),
                new ExportFilters(seller, null, category, null, payment));

        // O .xls (BIFF8) so tem 65.536 linhas por aba: informa a limitacao e aponta a alternativa compativel.
        if (format == ExportFormat.XLS && model.sales().size() > ExportService.XLS_ROW_LIMIT) {
            throw ApiException.badRequest("O recorte tem " + model.sales().size() + " linhas de detalhe e nao cabe no "
                    + "formato .xls (limite de " + ExportService.XLS_ROW_LIMIT + " linhas por aba). "
                    + "Use .xlsx ou reduza o periodo.");
        }

        byte[] bytes = writer.write(model, format);
        String name = "sbi-analises-" + from + "-a-" + to + "." + format.extension();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(name, StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(format.mediaType()))
                .contentLength(bytes.length)
                // O arquivo carrega dado da sessao: nunca fica em cache compartilhado.
                .cacheControl(org.springframework.http.CacheControl.noStore().cachePrivate())
                .body(new ByteArrayResource(bytes));
    }
}
