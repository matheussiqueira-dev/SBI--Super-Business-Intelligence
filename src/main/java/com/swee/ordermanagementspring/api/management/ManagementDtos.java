package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.backoffice.BackofficeDtos.StockProduct;
import com.swee.ordermanagementspring.api.common.MoneyDto;
import com.swee.ordermanagementspring.api.common.Refs.UserRef;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** Faturamento, metas, desempenho, estorno e analises do contrato v4 (REC-e: faturamento em /management/revenue). */
public final class ManagementDtos {
    private ManagementDtos() {
    }

    /** Periodos fechados em America/Fortaleza contados a partir de hoje (C-21). */
    public enum RevenuePeriod {
        TODAY(1), D7(7), D30(30), D90(90);

        private final int days;

        RevenuePeriod(int days) {
            this.days = days;
        }

        public DateRange range(LocalDate today) {
            return new DateRange(today.minusDays(days - 1L), today);
        }
    }

    public record DateRange(LocalDate from, LocalDate to) { }

    public record DailyRevenue(LocalDate date, MoneyDto netRevenue, MoneyDto grossProfit) { }

    public record PaymentMethodRevenue(String method, long ordersPaid, MoneyDto netRevenue) { }

    public record SellerRevenue(UserRef seller, long ordersPaid, MoneyDto netRevenue) { }

    public record ProductRevenue(long productId, String sku, String name, long unitsSold, MoneyDto netRevenue,
                                 MoneyDto grossProfit) { }

    public record RevenueReport(DateRange period, MoneyDto grossRevenue, MoneyDto refunds, MoneyDto netRevenue,
                                long ordersPaid, long unitsSold, MoneyDto averageTicket, MoneyDto grossProfit,
                                BigDecimal grossMarginPercent, BigDecimal costCoveragePercent, List<DailyRevenue> daily,
                                List<PaymentMethodRevenue> byPaymentMethod, List<SellerRevenue> bySeller,
                                List<ProductRevenue> topProducts, long lowStockCount, long pendingPaymentCount,
                                MoneyDto pendingPaymentAmount, OffsetDateTime generatedAt) { }

    // ---------------- metas e desempenho ----------------

    /** Mes no formato YYYY-MM (contrato v4). */
    public static final String MONTH = "^\\d{4}-(0[1-9]|1[0-2])$";

    public enum GoalState { SEM_META, EM_ANDAMENTO, META_ATINGIDA }

    public record SellerGoalRequest(@NotNull @Min(1) Long sellerId, @NotNull @Valid MoneyDto goal) { }

    public record MonthlyGoalsRequest(@NotNull @Pattern(regexp = MONTH) String period,
                                      @NotNull @Valid MoneyDto storeGoal,
                                      @NotNull @Size(max = 200) List<@NotNull @Valid SellerGoalRequest> sellers) { }

    public record SellerGoal(UserRef seller, MoneyDto goal) { }

    public record MonthlyGoals(String period, MoneyDto storeGoal, List<SellerGoal> sellers) { }

    public record SellerPerformance(String period, UserRef seller, MoneyDto goal, MoneyDto realized, MoneyDto remaining,
                                    BigDecimal achievementPercent, GoalState state) { }

    public record SellerMetric(UserRef seller, MoneyDto goal, MoneyDto realized, BigDecimal achievementPercent,
                               GoalState state) { }

    public record ManagementSummary(String period, MoneyDto storeGoal, MoneyDto storeRealized, MoneyDto remaining,
                                    BigDecimal achievementPercent, GoalState state, List<SellerMetric> team) { }

    // ---------------- estorno ----------------

    public record RefundRequest(@NotNull @Valid MoneyDto amount, @NotBlank @Size(min = 5, max = 200) String reason) { }

    public record RefundResponse(long id, long paymentId, MoneyDto amount, String reason, MoneyDto refundedTotal,
                                 MoneyDto remaining, UserRef createdBy, OffsetDateTime createdAt) { }

    // ---------------- analises ----------------

    public record WeeklyRevenue(LocalDate start, LocalDate end, MoneyDto realized) { }

    public record ProductMargin(long productId, String name, long units, MoneyDto netRevenue, MoneyDto cost,
                                MoneyDto grossMargin, BigDecimal marginPercent, long itemsWithoutCost) { }

    public record PromotionUsage(long promotionId, String name, long items, MoneyDto discountTotal, MoneyDto netRevenue) { }

    public record SellerManualDiscount(com.swee.ordermanagementspring.api.common.Refs.UserRef seller, long orders,
                                       MoneyDto amount, long approvedByManager) { }

    public record SalesAnalytics(String month, List<WeeklyRevenue> weekly, List<PaymentMethodRevenue> byPaymentMethod,
                                 List<ProductMargin> productMargins, List<PromotionUsage> promotionUsage,
                                 List<SellerManualDiscount> manualDiscounts) { }

    public record StockAnalytics(OffsetDateTime generatedAt, long products, long units, MoneyDto valueAtCost,
                                 MoneyDto valueAtPrice, long productsWithoutCost, List<StockProduct> belowMin) { }

    // ---------------- projecao, alerta de margem e sugestao de produto ----------------
    // Tres recursos NOVOS, em caminhos proprios. Os schemas de SellerPerformance, ManagementSummary,
    // SalesAnalytics e ProductMargin do contrato alvo v6 declaram additionalProperties: false, entao
    // acrescentar campo nas respostas existentes quebraria a verificacao ao vivo do contrato. Caminho
    // novo nao quebra: a conferencia vai do contrato para a API, nao da API para o contrato.

    /**
     * Projecao do fechamento do mes a partir do ritmo corrido. Nos primeiros dias a media diaria nao se
     * sustenta (um ou dois dias multiplicados por trinta), entao abaixo de MIN_DIAS_RITMO ela e ancorada
     * na media diaria do mes anterior, que e um mes fechado. E a mesma regra da carga do cenario.
     */
    public record MonthProjection(String period, MoneyDto storeGoal, MoneyDto realized, MoneyDto projected,
                                  MoneyDto gapToGoal, BigDecimal projectedAchievementPercent, MoneyDto dailyAverage,
                                  MoneyDto neededPerRemainingDay, int elapsedDays, int daysInMonth, int remainingDays,
                                  boolean anchoredOnPreviousMonth, GoalState projectedState) { }

    /** Nivel do alerta de margem, na escala de estado em graficos do manual v2.1 (secao 29). */
    public enum MarginLevel { BOM, ATENCAO, SERIO, CRITICO }

    public record MarginAlertRow(long productId, String name, long units, MoneyDto netRevenue, MoneyDto grossMargin,
                                 BigDecimal marginPercent, BigDecimal pointsBelowStore, MarginLevel level,
                                 long itemsWithoutCost) { }

    /**
     * Produtos com margem pressionada no mes. O limiar e a margem da propria loja no periodo, nao um numero
     * inventado: ATENCAO abaixo dela, SERIO abaixo de dois tercos dela e CRITICO abaixo de um terco ou negativa.
     * Produto sem custo informado nao vira margem zero: ele fica fora da conta e e contado em productsWithoutCost.
     */
    public record MarginAlert(String month, BigDecimal storeMarginPercent, MoneyDto storeNetRevenue,
                              MoneyDto storeGrossMargin, long productsConsidered, long productsWithoutCost,
                              List<MarginAlertRow> pressured) { }

    /**
     * Sugestao de reposicao de carteira para o proprio vendedor: produto que ELE ja vendeu (pagamento
     * aprovado) e que tem saldo disponivel agora. Historico autorizado e estoque, os dois do PostgreSQL.
     */
    public record ProductSuggestion(long productId, String sku, String name, String category, MoneyDto price,
                                    long available, long unitsSoldByMe, LocalDate lastSoldByMe) { }

    public record SellerSuggestions(String period, UserRef seller, List<ProductSuggestion> suggestions) { }
}
