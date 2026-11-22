package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.backoffice.BackofficeRepository;
import com.swee.ordermanagementspring.api.common.MoneyDto;
import com.swee.ordermanagementspring.api.management.ManagementDtos.*;
import com.swee.ordermanagementspring.entities.StoreTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** Analises do GERENTE sobre as views do V6 (B-09): evolucao semanal, formas de pagamento, margem, promocoes e estoque. */
@Service
@PreAuthorize("hasRole('GERENTE')")
public class AnalyticsService {
    private final JdbcClient jdbc;
    private final BackofficeRepository backoffice;

    public AnalyticsService(JdbcClient jdbc, BackofficeRepository backoffice) {
        this.jdbc = jdbc;
        this.backoffice = backoffice;
    }

    /**
     * Produtos com margem pressionada no mes. O limiar e a margem da PROPRIA LOJA no periodo, e nao um
     * numero escolhido a mao: ATENCAO abaixo dela, SERIO abaixo de dois tercos dela, CRITICO abaixo de um
     * terco ou com margem negativa. Assim o alerta acompanha o mes em vez de disparar sempre que a loja
     * inteira trabalha com margem menor.
     *
     * Produto sem custo informado nao entra na conta nem vira margem zero (a regra de sempre: o sistema diz
     * que nao sabe); ele e contado em productsWithoutCost.
     */
    @Transactional(readOnly = true)
    public MarginAlert marginAlerts(String period) {
        LocalDate month = GoalsService.month(period);
        record Linha(long productId, String name, long units, BigDecimal netRevenue, BigDecimal cost,
                     BigDecimal grossMargin, BigDecimal marginPercent, long itemsWithoutCost) { }
        var linhas = jdbc.sql("""
                SELECT product_id, produto, unidades, receita_liquida, custo, margem_bruta, margem_pct, itens_sem_custo
                  FROM v_margem_produto WHERE periodo = :month ORDER BY receita_liquida DESC, product_id""")
                .param("month", month)
                .query((rs, n) -> new Linha(rs.getLong("product_id"), rs.getString("produto"), rs.getLong("unidades"),
                        rs.getBigDecimal("receita_liquida"), rs.getBigDecimal("custo"), rs.getBigDecimal("margem_bruta"),
                        rs.getBigDecimal("margem_pct"), rs.getLong("itens_sem_custo")))
                .list();

        // Margem da loja no periodo: soma das margens sobre a soma das receitas, so dos produtos com custo.
        BigDecimal receitaLoja = BigDecimal.ZERO;
        BigDecimal margemLoja = BigDecimal.ZERO;
        long semCusto = 0;
        long consideradas = 0;
        for (Linha l : linhas) {
            if (l.marginPercent() == null) { semCusto++; continue; }
            consideradas++;
            receitaLoja = receitaLoja.add(l.netRevenue() == null ? BigDecimal.ZERO : l.netRevenue());
            margemLoja = margemLoja.add(l.grossMargin() == null ? BigDecimal.ZERO : l.grossMargin());
        }
        BigDecimal pctLoja = receitaLoja.signum() == 0 ? null
                : margemLoja.multiply(BigDecimal.valueOf(100)).divide(receitaLoja, 1, RoundingMode.HALF_UP);

        var pressionados = new java.util.ArrayList<MarginAlertRow>();
        if (pctLoja != null) {
            BigDecimal doisTercos = pctLoja.multiply(BigDecimal.valueOf(2)).divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            BigDecimal umTerco = pctLoja.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            for (Linha l : linhas) {
                BigDecimal pct = l.marginPercent();
                if (pct == null || pct.compareTo(pctLoja) >= 0) continue;
                MarginLevel nivel = pct.signum() < 0 || pct.compareTo(umTerco) < 0 ? MarginLevel.CRITICO
                        : pct.compareTo(doisTercos) < 0 ? MarginLevel.SERIO : MarginLevel.ATENCAO;
                pressionados.add(new MarginAlertRow(l.productId(), l.name(), l.units(),
                        MoneyDto.of(l.netRevenue()), MoneyDto.of(l.grossMargin()), pct,
                        pctLoja.subtract(pct).setScale(1, RoundingMode.HALF_UP), nivel, l.itemsWithoutCost()));
            }
            // Pior margem primeiro: e a linha que pede acao.
            pressionados.sort((a, b) -> a.marginPercent().compareTo(b.marginPercent()));
        }
        return new MarginAlert(period, pctLoja, MoneyDto.of(receitaLoja), MoneyDto.of(margemLoja),
                consideradas, semCusto, List.copyOf(pressionados));
    }

    @Transactional(readOnly = true)
    public SalesAnalytics sales(String period) {
        LocalDate month = GoalsService.month(period);
        var weekly = jdbc.sql("SELECT inicio, fim, realizado FROM v_evolucao_semanal_loja WHERE periodo = :month ORDER BY inicio")
                .param("month", month)
                .query((rs, n) -> new WeeklyRevenue(rs.getObject("inicio", LocalDate.class), rs.getObject("fim", LocalDate.class),
                        MoneyDto.of(rs.getBigDecimal("realizado")))).list();
        var methods = jdbc.sql("""
                SELECT forma, pedidos, valor FROM v_vendas_forma_pagamento WHERE periodo = :month ORDER BY valor DESC, forma""")
                .param("month", month)
                .query((rs, n) -> new PaymentMethodRevenue(rs.getString("forma"), rs.getLong("pedidos"),
                        MoneyDto.of(rs.getBigDecimal("valor")))).list();
        var margins = jdbc.sql("""
                SELECT product_id, produto, unidades, receita_liquida, custo, margem_bruta, margem_pct, itens_sem_custo
                  FROM v_margem_produto WHERE periodo = :month ORDER BY receita_liquida DESC, product_id""")
                .param("month", month)
                .query((rs, n) -> new ProductMargin(rs.getLong("product_id"), rs.getString("produto"), rs.getLong("unidades"),
                        MoneyDto.of(rs.getBigDecimal("receita_liquida")), MoneyDto.of(rs.getBigDecimal("custo")),
                        MoneyDto.of(rs.getBigDecimal("margem_bruta")), rs.getBigDecimal("margem_pct"), rs.getLong("itens_sem_custo")))
                .list();
        // D-EXEC-03: v_uso_promocoes nao tem periodo; o uso do mes segue a mesma regra (itens de pagamentos confirmados).
        var promotions = jdbc.sql("""
                SELECT pr.id, pr.name, count(oi.id) AS itens, coalesce(sum(oi.discount - oi.manual_discount), 0) AS desconto,
                       coalesce(sum(oi.price * oi.quantity - oi.discount), 0) AS receita
                  FROM promotion pr
                  JOIN order_item oi ON oi.promotion_id = pr.id
                  JOIN payment p ON p.order_id = oi.order_id AND p.status = 'APPROVED'
                 WHERE p.payment_date >= :month AND p.payment_date < CAST(:month AS date) + interval '1 month'
                 GROUP BY pr.id, pr.name ORDER BY receita DESC, pr.id""")
                .param("month", month)
                .query((rs, n) -> new PromotionUsage(rs.getLong("id"), rs.getString("name"), rs.getLong("itens"),
                        MoneyDto.of(rs.getBigDecimal("desconto")), MoneyDto.of(rs.getBigDecimal("receita")))).list();
        // G-04: contrapartida das promocoes; o desconto manual fica fora de promotionUsage (V11).
        var manual = jdbc.sql("""
                SELECT seller_id, vendedor, pedidos, valor_concedido, aprovados_por_gerente
                  FROM v_descontos_manuais WHERE periodo = :month ORDER BY valor_concedido DESC, seller_id""")
                .param("month", month)
                .query((rs, n) -> new SellerManualDiscount(new com.swee.ordermanagementspring.api.common.Refs.UserRef(
                        rs.getLong("seller_id"), rs.getString("vendedor")), rs.getLong("pedidos"),
                        MoneyDto.of(rs.getBigDecimal("valor_concedido")), rs.getLong("aprovados_por_gerente"))).list();
        return new SalesAnalytics(period, weekly, methods, margins, promotions, manual);
    }

    /** D-EXEC-04: so produtos ativos; valor a custo fica nulo se algum produto com saldo nao tiver custo. */
    @Transactional(readOnly = true)
    public StockAnalytics stock() {
        record Totals(long products, long units, BigDecimal atCost, BigDecimal atPrice, long withoutCost, long stockedWithoutCost) { }
        Totals totals = jdbc.sql("""
                SELECT count(*) AS produtos, coalesce(sum(saldo), 0) AS unidades,
                       coalesce(sum(valor_em_estoque_custo), 0) AS custo, coalesce(sum(valor_em_estoque_venda), 0) AS venda,
                       count(*) FILTER (WHERE custo_medio IS NULL) AS sem_custo,
                       count(*) FILTER (WHERE custo_medio IS NULL AND saldo > 0) AS com_saldo_sem_custo
                  FROM v_posicao_estoque WHERE ativo""")
                .query((rs, n) -> new Totals(rs.getLong("produtos"), rs.getLong("unidades"), rs.getBigDecimal("custo"),
                        rs.getBigDecimal("venda"), rs.getLong("sem_custo"), rs.getLong("com_saldo_sem_custo"))).single();
        var below = jdbc.sql("SELECT product_id FROM v_alerta_estoque ORDER BY lower(produto), product_id").query(Long.class).list()
                .stream().map(id -> backoffice.stock(id).orElseThrow()).toList();
        return new StockAnalytics(OffsetDateTime.now(StoreTime.clock()), totals.products(), totals.units(),
                totals.stockedWithoutCost() > 0 ? null : MoneyDto.of(totals.atCost()), MoneyDto.of(totals.atPrice()),
                totals.withoutCost(), below);
    }
}
