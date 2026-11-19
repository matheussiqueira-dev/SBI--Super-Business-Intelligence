package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportFilters;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportModel;
import com.swee.ordermanagementspring.api.management.ExportDtos.GoalRow;
import com.swee.ordermanagementspring.api.management.ExportDtos.SaleRow;
import com.swee.ordermanagementspring.api.management.ExportDtos.Totals;
import com.swee.ordermanagementspring.api.management.ManagementDtos.DateRange;
import com.swee.ordermanagementspring.entities.Money;
import com.swee.ordermanagementspring.entities.StoreTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Recorte da exportacao de analises (D-EVO-55). Somente GERENTE (URL em /analytics/** e servico), como o
 * resto de /analytics: o escopo autorizado e decidido aqui, no servidor, e nao no navegador.
 *
 * As tres abas saem das MESMAS views que alimentam os indicadores da tela e o roteiro SQL da banca
 * (v_fato_venda_item, v_fato_estorno, v_desempenho_vendedor, monthly_goal), numa unica transacao
 * REPEATABLE READ. Por isso a planilha reconcilia com o psql e com o painel por construcao, e nao por
 * coincidencia: faturamento confirmado = pagamento aprovado menos estorno, somado no grao do item.
 */
@Service
@PreAuthorize("hasRole('GERENTE')")
public class ExportService {

    /** Teto de linhas de detalhe por arquivo. O .xls (BIFF8) so tem 65.536 linhas por aba. */
    static final int XLS_ROW_LIMIT = 65_000;

    private final JdbcClient jdbc;

    public ExportService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExportModel model(CurrentUser user, DateRange period, ExportFilters requested) {
        ExportFilters filters = resolveFilters(requested);
        List<SaleRow> sales = sales(period, filters);
        List<GoalRow> goals = goals(period, filters);
        return new ExportModel(period, filters, user.name(), user.executive() ? "CEO" : "GERENTE",
                StoreTime.ZONE.getId(), OffsetDateTime.now(StoreTime.clock()),
                totals(sales, goals, period, filters), sales, goals);
    }

    /** Completa o nome do vendedor e da categoria do filtro, para a aba Resumo registrar o recorte por extenso. */
    private ExportFilters resolveFilters(ExportFilters f) {
        String seller = f.sellerId() == null ? null : jdbc.sql("SELECT name FROM app_users WHERE id = :id")
                .param("id", f.sellerId()).query(String.class).optional().orElse("#" + f.sellerId());
        String category = f.categoryId() == null ? null : jdbc.sql("SELECT name FROM category WHERE id = :id")
                .param("id", f.categoryId()).query(String.class).optional().orElse("#" + f.categoryId());
        return new ExportFilters(f.sellerId(), seller, f.categoryId(), category, f.paymentMethod());
    }

    /**
     * Aba Vendas, no grao do item, mais uma linha por estorno. O predicado de filtro usa o idiomatismo do
     * projeto (CAST(:p AS tipo) IS NULL OR coluna = :p), igual a SalesRepository.LIST_FILTER.
     */
    private List<SaleRow> sales(DateRange period, ExportFilters f) {
        var rows = new ArrayList<SaleRow>(jdbc.sql("""
                SELECT f.data, f.order_id, f.forma_pagamento, f.unidades, f.receita_liquida, f.desconto, f.custo,
                       p.sku, p.name AS produto, coalesce(cat.name, 'Nao informado') AS categoria,
                       coalesce(vend.name, 'Nao informado') AS vendedor,
                       coalesce(ger.name, 'Sem gerente') AS equipe,
                       coalesce(cli.name, 'Nao informado') AS cliente
                  FROM v_fato_venda_item f
                  JOIN product p            ON p.id = f.product_id
                  LEFT JOIN category cat    ON cat.id = p.category_id
                  LEFT JOIN app_users vend  ON vend.id = f.seller_id
                  LEFT JOIN app_users ger   ON ger.id = vend.manager_id
                  LEFT JOIN customer cli    ON cli.id = f.customer_id
                 WHERE f.data BETWEEN :from AND :to
                   AND (CAST(:seller AS bigint) IS NULL OR f.seller_id = :seller)
                   AND (CAST(:category AS bigint) IS NULL OR f.category_id = :category)
                   AND (CAST(:payment AS varchar) IS NULL OR f.forma_pagamento = :payment)
                 ORDER BY f.data, f.order_id, p.sku""")
                .param("from", period.from()).param("to", period.to())
                .param("seller", f.sellerId()).param("category", f.categoryId()).param("payment", f.paymentMethod())
                .query((rs, n) -> {
                    BigDecimal revenue = rs.getBigDecimal("receita_liquida");
                    BigDecimal cost = rs.getBigDecimal("custo");
                    int units = rs.getInt("unidades");
                    BigDecimal unit = units == 0 ? null
                            : revenue.add(rs.getBigDecimal("desconto")).divide(BigDecimal.valueOf(units), 2, RoundingMode.HALF_UP);
                    return new SaleRow(rs.getObject("data", LocalDate.class), "VENDA", rs.getLong("order_id"),
                            rs.getString("forma_pagamento"), rs.getString("cliente"), rs.getString("vendedor"),
                            rs.getString("equipe"), rs.getString("sku"), rs.getString("produto"), rs.getString("categoria"),
                            units, unit, rs.getBigDecimal("desconto"), Money.of(revenue), cost == null ? null : Money.of(cost),
                            // Margem fica nula quando falta custo: "Nao informado", nunca zero inventado (C-20).
                            cost == null ? null : Money.of(revenue.subtract(cost)));
                }).list());

        // Estorno nao tem item nem categoria. O filtro de categoria exclui os estornos, porque nao existe
        // estorno "de uma categoria": incluir seria somar um valor que o filtro da tela nao mostra.
        if (f.categoryId() == null) {
            rows.addAll(jdbc.sql("""
                    SELECT e.data, e.order_id, e.forma_pagamento, e.valor,
                           coalesce(vend.name, 'Nao informado') AS vendedor,
                           coalesce(ger.name, 'Sem gerente') AS equipe,
                           coalesce(cli.name, 'Nao informado') AS cliente
                      FROM v_fato_estorno e
                      LEFT JOIN app_users vend ON vend.id = e.seller_id
                      LEFT JOIN app_users ger  ON ger.id = vend.manager_id
                      LEFT JOIN orders o       ON o.id = e.order_id
                      LEFT JOIN customer cli   ON cli.id = o.customer_id
                     WHERE e.data BETWEEN :from AND :to
                       AND (CAST(:seller AS bigint) IS NULL OR e.seller_id = :seller)
                       AND (CAST(:payment AS varchar) IS NULL OR e.forma_pagamento = :payment)
                     ORDER BY e.data, e.order_id""")
                    .param("from", period.from()).param("to", period.to())
                    .param("seller", f.sellerId()).param("payment", f.paymentMethod())
                    .query((rs, n) -> new SaleRow(rs.getObject("data", LocalDate.class), "ESTORNO", rs.getLong("order_id"),
                            rs.getString("forma_pagamento"), rs.getString("cliente"), rs.getString("vendedor"),
                            rs.getString("equipe"), null, "Estorno do pedido " + rs.getLong("order_id"), null,
                            null, null, null, Money.of(rs.getBigDecimal("valor").negate()), null, null)).list());
            rows.sort((a, b) -> {
                int byDate = a.date().compareTo(b.date());
                if (byDate != 0) return byDate;
                int byOrder = Long.compare(a.orderId(), b.orderId());
                return byOrder != 0 ? byOrder : a.kind().compareTo(b.kind());
            });
        }
        return List.copyOf(rows);
    }

    /**
     * Aba Metas: cada vendedor nos meses que o periodo toca, pela view do projeto, mais a linha do plano da
     * loja por mes. O realizado da loja inclui a venda do gerente, que soma na loja e nao tem meta individual
     * (nao existe seller_goal para GERENTE: gatilho trg_seller_goal_is_seller).
     */
    private List<GoalRow> goals(DateRange period, ExportFilters f) {
        // monthly_goal.period e sempre o dia 1 (CHECK monthly_goal_period_check), entao a janela de meses
        // que o periodo toca e um intervalo simples entre os dois primeiros dias de mes.
        LocalDate monthFrom = YearMonth.from(period.from()).atDay(1);
        LocalDate monthTo = YearMonth.from(period.to()).atDay(1);
        var rows = new ArrayList<GoalRow>(jdbc.sql("""
                SELECT d.periodo, d.vendedor, coalesce(ger.name, 'Sem gerente') AS equipe,
                       d.meta, d.realizado, d.atingimento_pct, d.falta, d.situacao
                  FROM v_desempenho_vendedor d
                  JOIN app_users v         ON v.id = d.seller_id
                  LEFT JOIN app_users ger  ON ger.id = v.manager_id
                 WHERE d.periodo BETWEEN :monthFrom AND :monthTo
                   AND (CAST(:seller AS bigint) IS NULL OR d.seller_id = :seller)
                 ORDER BY d.periodo, d.vendedor""")
                .param("monthFrom", monthFrom).param("monthTo", monthTo).param("seller", f.sellerId())
                .query((rs, n) -> new GoalRow(YearMonth.from(rs.getObject("periodo", LocalDate.class)).toString(),
                        "Vendedor", rs.getString("vendedor"), rs.getString("equipe"), rs.getBigDecimal("meta"),
                        Money.of(rs.getBigDecimal("realizado")), rs.getBigDecimal("atingimento_pct"),
                        rs.getBigDecimal("falta"), rs.getString("situacao"))).list());

        // Linha do plano da loja: so sem filtro de vendedor, porque o plano da loja nao e de um vendedor.
        if (f.sellerId() == null) {
            rows.addAll(jdbc.sql("""
                    SELECT g.period, g.amount AS meta,
                           coalesce((SELECT sum(l.valor) FROM v_lancamento_realizado l
                                      WHERE l.data >= g.period AND l.data < g.period + interval '1 month'), 0) AS realizado
                      FROM monthly_goal g
                     WHERE g.period BETWEEN :monthFrom AND :monthTo
                     ORDER BY g.period""")
                    .param("monthFrom", monthFrom).param("monthTo", monthTo)
                    .query((rs, n) -> {
                        BigDecimal goal = rs.getBigDecimal("meta");
                        BigDecimal realized = Money.of(rs.getBigDecimal("realizado"));
                        return new GoalRow(YearMonth.from(rs.getObject("period", LocalDate.class)).toString(),
                                "Loja", "Todos", "Loja", goal, realized, percent(realized, goal),
                                goal.subtract(realized).max(BigDecimal.ZERO),
                                goal.signum() == 0 ? "Sem meta" : realized.compareTo(goal) >= 0 ? "Meta atingida" : "Em andamento");
                    }).list());
            rows.sort((a, b) -> {
                int byPeriod = a.period().compareTo(b.period());
                return byPeriod != 0 ? byPeriod : a.scope().compareTo(b.scope());
            });
        }
        return List.copyOf(rows);
    }

    /** Totais do Resumo, somados das linhas da aba Vendas: o arquivo fecha consigo mesmo. */
    private Totals totals(List<SaleRow> sales, List<GoalRow> goals, DateRange period, ExportFilters filters) {
        long paidOrders = sales.stream().filter(r -> "VENDA".equals(r.kind())).map(SaleRow::orderId).distinct().count();
        long items = sales.stream().filter(r -> "VENDA".equals(r.kind())).count();
        long units = sales.stream().filter(r -> "VENDA".equals(r.kind()))
                .mapToLong(r -> r.units() == null ? 0 : r.units()).sum();
        BigDecimal gross = sum(sales.stream().filter(r -> "VENDA".equals(r.kind())).map(SaleRow::netRevenue));
        BigDecimal discounts = sum(sales.stream().filter(r -> "VENDA".equals(r.kind())).map(SaleRow::discount));
        BigDecimal refunds = sum(sales.stream().filter(r -> "ESTORNO".equals(r.kind())).map(SaleRow::netRevenue)).negate();
        BigDecimal net = gross.subtract(refunds);
        // Ticket medio pela MESMA definicao do painel (ManagementService: gross / ordersPaid). Dividir o
        // liquido daria outro numero para o mesmo recorte sempre que houvesse estorno, e a planilha deixaria
        // de fechar com a tela: em novembro/2026 seriam 3.861,22 aqui contra 3.989,11 na tela.
        BigDecimal ticket = paidOrders == 0 ? null
                : gross.divide(BigDecimal.valueOf(paidOrders), 2, RoundingMode.HALF_UP);
        // Custo e margem ficam nulos quando algum item vendido nao tem custo informado (C-20).
        long withoutCost = sales.stream().filter(r -> "VENDA".equals(r.kind()) && r.cost() == null).count();
        BigDecimal cost = withoutCost > 0 ? null : sum(sales.stream().filter(r -> "VENDA".equals(r.kind())).map(SaleRow::cost));
        BigDecimal margin = cost == null ? null : net.subtract(cost);
        // Margem sobre o faturamento so faz sentido com faturamento POSITIVO: num recorte em que o estorno
        // supera as vendas (net < 0), dividir por net inverte o sinal e um prejuizo apareceria como +116%.
        // Sem denominador valido a planilha escreve "Nao informado", nunca um percentual enganoso.
        BigDecimal marginPercent = margin == null || net.signum() <= 0 ? null
                : margin.multiply(BigDecimal.valueOf(100)).divide(net, 1, RoundingMode.HALF_UP);
        BigDecimal periodGoal = sum(goals.stream().filter(g -> "Loja".equals(g.scope())).map(GoalRow::goal));

        // A meta e sempre do MES INTEIRO e sempre da LOJA INTEIRA. Comparar com ela um realizado que cobre
        // parte do mes, ou que um filtro reduziu, daria um atingimento falso (o numerador encolhe e o
        // denominador nao). Nesses casos a planilha nao mostra percentual: mostra o motivo.
        String goalNote = null;
        boolean mesesInteiros = period.from().getDayOfMonth() == 1
                && period.to().equals(period.to().withDayOfMonth(period.to().lengthOfMonth()));
        // A ordem importa: o filtro de vendedor nao traz as linhas de escopo "Loja" (goals(), abaixo), entao
        // periodGoal fica zero e, se a primeira pergunta fosse "tem meta?", a planilha afirmaria que nenhum mes
        // tem meta cadastrada enquanto a aba Metas do mesmo arquivo mostra as metas do vendedor.
        if (filters.any()) {
            goalNote = "Nao comparavel: a meta e da loja inteira e o recorte esta filtrado ("
                    + filters.describe() + "). Veja a aba Metas para o mes inteiro e sem filtro.";
        } else if (periodGoal.signum() == 0) {
            goalNote = "Nenhum mes do periodo tem meta cadastrada.";
        } else if (!mesesInteiros) {
            goalNote = "Nao comparavel: a meta e do mes inteiro e o periodo cobre so parte dele ("
                    + period.from() + " a " + period.to() + "). Veja a aba Metas para o mes fechado.";
        }
        boolean comparavel = goalNote == null;
        return new Totals(paidOrders, items, units, gross, discounts, refunds, net, ticket, cost, margin, marginPercent,
                withoutCost, comparavel ? periodGoal : null, comparavel ? percent(net, periodGoal) : null, goalNote);
    }

    private static BigDecimal sum(java.util.stream.Stream<BigDecimal> values) {
        return values.filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Percentual com uma casa, so com denominador valido (nunca divide por zero nem por nulo). */
    private static BigDecimal percent(BigDecimal value, BigDecimal total) {
        if (value == null || total == null || total.signum() == 0) return null;
        return value.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP);
    }
}
