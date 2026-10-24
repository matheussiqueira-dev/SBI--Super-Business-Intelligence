package com.swee.ordermanagementspring.api.executive;

import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.common.DbSessionContext;
import com.swee.ordermanagementspring.api.common.MoneyDto;
import com.swee.ordermanagementspring.api.common.Refs.CategoryRef;
import com.swee.ordermanagementspring.api.common.Refs.UserRef;
import com.swee.ordermanagementspring.api.executive.ExecutiveDtos.*;
import com.swee.ordermanagementspring.entities.StoreTime;
import com.swee.ordermanagementspring.entities.audit.AuditAction;
import com.swee.ordermanagementspring.entities.auth.UserRole;
import com.swee.ordermanagementspring.security.AuditService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Visao do CEO (RF-28 e RF-29): modelo do painel executivo e meta anual da loja. Somente CEO (URL e servico).
 * O modelo e lido numa unica transacao REPEATABLE READ, para fatos, metas e cadastros formarem a mesma fotografia.
 */
@Service
@PreAuthorize("hasRole('CEO')")
public class ExecutiveService {
    private final JdbcClient jdbc;
    private final DbSessionContext session;
    private final AuditService audit;
    private final ObjectMapper mapper;

    public ExecutiveService(JdbcClient jdbc, DbSessionContext session, AuditService audit, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.session = session;
        this.audit = audit;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExecutiveOverview overview(int year) {
        LocalDate from = LocalDate.of(year - 1, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        var people = jdbc.sql("""
                SELECT u.id, u.name, u.role, u.active, u.manager_id FROM app_users u
                  JOIN role r ON r.code = u.role
                 ORDER BY r.rank DESC, lower(u.name), u.id""")
                .query((rs, n) -> new Person(rs.getLong("id"), rs.getString("name"), UserRole.valueOf(rs.getString("role")),
                        rs.getBoolean("active"), rs.getObject("manager_id", Long.class))).list();
        var categories = jdbc.sql("SELECT id, name FROM category ORDER BY lower(name), id")
                .query((rs, n) -> new CategoryRef(rs.getLong("id"), rs.getString("name"))).list();
        var products = jdbc.sql("""
                SELECT p.id, p.sku, p.name, p.category_id, p.price, b.avg_cost, p.active
                  FROM product p LEFT JOIN stock_balance b ON b.product_id = p.id
                 ORDER BY lower(p.name), p.id""")
                .query((rs, n) -> new Product(rs.getLong("id"), rs.getString("sku"), rs.getString("name"),
                        rs.getObject("category_id", Long.class), MoneyDto.of(rs.getBigDecimal("price")),
                        MoneyDto.of(rs.getBigDecimal("avg_cost")), rs.getBoolean("active"))).list();
        var sales = jdbc.sql("""
                SELECT data, order_id, seller_id, customer_id, forma_pagamento, product_id, unidades, receita_liquida,
                       desconto, custo
                  FROM v_fato_venda_item WHERE data BETWEEN :from AND :to
                 ORDER BY data, order_id, product_id""")
                .param("from", from).param("to", to)
                .query((rs, n) -> new SaleFact(rs.getObject("data", LocalDate.class), rs.getLong("order_id"),
                        rs.getObject("seller_id", Long.class), rs.getObject("customer_id", Long.class),
                        rs.getString("forma_pagamento"), rs.getLong("product_id"), rs.getInt("unidades"),
                        MoneyDto.of(rs.getBigDecimal("receita_liquida")), MoneyDto.of(rs.getBigDecimal("desconto")),
                        MoneyDto.of(rs.getBigDecimal("custo")))).list();
        var refunds = jdbc.sql("""
                SELECT data, order_id, seller_id, forma_pagamento, valor
                  FROM v_fato_estorno WHERE data BETWEEN :from AND :to
                 ORDER BY data, order_id""")
                .param("from", from).param("to", to)
                .query((rs, n) -> new RefundFact(rs.getObject("data", LocalDate.class), rs.getLong("order_id"),
                        rs.getObject("seller_id", Long.class), rs.getString("forma_pagamento"),
                        MoneyDto.of(rs.getBigDecimal("valor")))).list();
        return new ExecutiveOverview(year, StoreTime.today(), from, to, annualGoal(year).orElse(null), monthlyGoals(year),
                people, categories, products, sales, refunds, OffsetDateTime.now(StoreTime.clock()));
    }

    /** Metas mensais do ano (so os meses com meta) e a distribuicao por vendedor. */
    private List<MonthGoal> monthlyGoals(int year) {
        record Row(LocalDate period, BigDecimal store, Long seller, BigDecimal goal) { }
        var rows = jdbc.sql("""
                SELECT g.period, g.amount, sg.seller_id, sg.amount AS seller_amount
                  FROM monthly_goal g LEFT JOIN seller_goal sg ON sg.monthly_goal_id = g.id
                 WHERE g.period BETWEEN :from AND :to
                 ORDER BY g.period, sg.seller_id""")
                .param("from", LocalDate.of(year, 1, 1)).param("to", LocalDate.of(year, 12, 1))
                .query((rs, n) -> new Row(rs.getObject("period", LocalDate.class), rs.getBigDecimal("amount"),
                        rs.getObject("seller_id", Long.class), rs.getBigDecimal("seller_amount"))).list();
        Map<LocalDate, MonthGoal> months = new LinkedHashMap<>();
        for (Row row : rows) {
            MonthGoal month = months.computeIfAbsent(row.period(), period ->
                    new MonthGoal(YearMonth.from(period).toString(), MoneyDto.of(row.store()), new ArrayList<>()));
            if (row.seller() != null) month.sellers().add(new SellerGoalShare(row.seller(), MoneyDto.of(row.goal())));
        }
        return months.values().stream().map(m -> new MonthGoal(m.period(), m.storeGoal(), List.copyOf(m.sellers()))).toList();
    }

    private Optional<AnnualGoal> annualGoal(int year) {
        return jdbc.sql("""
                SELECT g.year, g.amount, g.updated_by, u.name, g.updated_at
                  FROM annual_goal g JOIN app_users u ON u.id = g.updated_by WHERE g.year = :year""")
                .param("year", year)
                .query((rs, n) -> new AnnualGoal(rs.getInt("year"), MoneyDto.of(rs.getBigDecimal("amount")),
                        new UserRef(rs.getLong("updated_by"), rs.getString("name")),
                        rs.getObject("updated_at", OffsetDateTime.class).atZoneSameInstant(StoreTime.ZONE).toOffsetDateTime()))
                .optional();
    }

    /** Meta anual da loja (RF-29): grava ou substitui a do ano; o gatilho da V12 so aceita autor CEO. */
    @Transactional
    public AnnualGoal saveAnnualGoal(CurrentUser user, AnnualGoalRequest request) {
        session.apply(user.id(), null);
        var before = annualGoal(request.year()).map(goal -> goal.amount().value()).orElse(null);
        jdbc.sql("""
                INSERT INTO annual_goal(year, amount, updated_by, updated_at) VALUES (:year, :amount, :user, now())
                ON CONFLICT (year) DO UPDATE SET amount = EXCLUDED.amount, updated_by = EXCLUDED.updated_by, updated_at = now()""")
                .param("year", request.year()).param("amount", request.amount().value()).param("user", user.id()).update();
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("year", request.year());
        detail.put("from", before);
        detail.put("to", request.amount().value());
        audit.record(AuditAction.ANNUAL_GOAL_SAVED, user.id(), "annual_goal", request.year().longValue(),
                mapper.writeValueAsString(detail));
        return annualGoal(request.year()).orElseThrow();
    }
}
