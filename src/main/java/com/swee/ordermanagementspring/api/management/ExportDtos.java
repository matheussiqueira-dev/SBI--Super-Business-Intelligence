package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.management.ManagementDtos.DateRange;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Modelo da exportacao de /analytics/export (D-EVO-55). Nao vai para o contrato JSON: a resposta do
 * endpoint e o arquivo. Estes registros sao o recorte lido do PostgreSQL, uma unica vez, em
 * REPEATABLE READ, para as tres abas (Resumo, Vendas e Metas) descreverem a mesma fotografia.
 *
 * Grao: a aba Vendas e por ITEM de pedido, com uma linha por estorno; somar receitaLiquida de todas as
 * linhas da aba da exatamente o faturamento confirmado do Resumo. O grao fica escrito na propria aba.
 */
public final class ExportDtos {
    private ExportDtos() {
    }

    /** Formatos aceitos. O .xls e BIFF8 real (HSSF), nao um CSV renomeado. */
    public enum ExportFormat {
        XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        XLS("xls", "application/vnd.ms-excel"),
        CSV("csv", "text/csv;charset=utf-8");

        private final String extension;
        private final String mediaType;

        ExportFormat(String extension, String mediaType) {
            this.extension = extension;
            this.mediaType = mediaType;
        }

        public String extension() {
            return extension;
        }

        public String mediaType() {
            return mediaType;
        }
    }

    /** Filtros da tela que o servidor reaplica como predicado SQL; nulo = sem filtro. */
    public record ExportFilters(Long sellerId, String sellerName, Long categoryId, String categoryName,
                                String paymentMethod) {

        public boolean any() {
            return sellerId != null || categoryId != null || paymentMethod != null;
        }

        /** Recorte por extenso, para o cabecalho da planilha e para o motivo de uma comparacao nao feita. */
        public String describe() {
            if (!any()) return "sem filtro";
            StringBuilder sb = new StringBuilder();
            if (sellerName != null) sb.append("vendedor: ").append(sellerName);
            if (categoryName != null) {
                if (!sb.isEmpty()) sb.append(" - ");
                sb.append("categoria: ").append(categoryName);
            }
            if (paymentMethod != null) {
                if (!sb.isEmpty()) sb.append(" - ");
                sb.append("pagamento: ").append(paymentMethod);
            }
            return sb.toString();
        }
    }

    /** Linha da aba Vendas. tipo e VENDA ou ESTORNO; no estorno a receita e negativa e nao ha item. */
    public record SaleRow(LocalDate date, String kind, long orderId, String paymentMethod, String customer,
                          String seller, String team, String sku, String product, String category,
                          Integer units, BigDecimal unitPrice, BigDecimal discount, BigDecimal netRevenue,
                          BigDecimal cost, BigDecimal margin) { }

    /** Linha da aba Metas: um vendedor num mes, mais a linha do plano da loja. */
    public record GoalRow(String period, String scope, String seller, String team, BigDecimal goal,
                          BigDecimal realized, BigDecimal achievementPercent, BigDecimal remaining,
                          String state) { }

    /**
     * Totais da aba Resumo, na mesma definicao do painel: pagamento confirmado menos estorno.
     * periodGoal e goalAchievementPercent sao nulos quando a comparacao com a meta nao seria honesta
     * (periodo que nao cobre meses inteiros, ou filtro ativo, que reduz o realizado e nao a meta);
     * goalNote diz por que, para a planilha escrever o motivo em vez de um percentual sem sentido.
     */
    public record Totals(long paidOrders, long items, long units, BigDecimal grossRevenue, BigDecimal discounts,
                         BigDecimal refunds, BigDecimal netRevenue, BigDecimal averageTicket, BigDecimal cost,
                         BigDecimal margin, BigDecimal marginPercent, long itemsWithoutCost,
                         BigDecimal periodGoal, BigDecimal goalAchievementPercent, String goalNote) { }

    /** Recorte completo entregue ao escritor da planilha. */
    public record ExportModel(DateRange period, ExportFilters filters, String requestedBy, String requestedByRole,
                              String timeZone, OffsetDateTime generatedAt, Totals totals, List<SaleRow> sales,
                              List<GoalRow> goals) { }
}
