package com.swee.ordermanagementspring.api.executive;

import com.swee.ordermanagementspring.api.common.MoneyDto;
import com.swee.ordermanagementspring.api.common.Refs.CategoryRef;
import com.swee.ordermanagementspring.api.common.Refs.UserRef;
import com.swee.ordermanagementspring.entities.auth.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Painel executivo do CEO (contrato v6, D-EVO-45): o modelo vai inteiro para a tela, como um modelo importado de BI,
 * e os filtros cruzados e o drill-down acontecem no navegador sem nova chamada. Grao dos fatos: item de pedido pago e
 * estorno, nas mesmas regras das views do V6 (v_fato_venda_item e v_fato_estorno, V12).
 */
public final class ExecutiveDtos {
    private ExecutiveDtos() {
    }

    public static final int MIN_YEAR = 2000;
    public static final int MAX_YEAR = 2100;

    /** Pessoa da equipe; managerId e o GERENTE responsavel pelo VENDEDOR (nulo = sem equipe). */
    public record Person(long id, String name, UserRole role, boolean active, Long managerId) { }

    /** Produto com o preco de venda e o custo medio atuais (preco de compra); custo nulo = nao informado. */
    public record Product(long id, String sku, String name, Long categoryId, MoneyDto price, MoneyDto averageCost,
                          boolean active) { }

    /** Item de pedido com pagamento confirmado, no dia do pagamento; cost nulo quando o item nao tem custo. */
    public record SaleFact(LocalDate date, long orderId, Long sellerId, Long customerId, String paymentMethod, long productId,
                           int units, MoneyDto netRevenue, MoneyDto discount, MoneyDto cost) { }

    /** Estorno, no dia em que foi registrado; e do pedido, nao de um produto. */
    public record RefundFact(LocalDate date, long orderId, Long sellerId, String paymentMethod, MoneyDto amount) { }

    public record SellerGoalShare(long sellerId, MoneyDto goal) { }

    public record MonthGoal(String period, MoneyDto storeGoal, List<SellerGoalShare> sellers) { }

    public record AnnualGoal(int year, MoneyDto amount, UserRef updatedBy, OffsetDateTime updatedAt) { }

    /**
     * Modelo do ano escolhido e do anterior (comparacao com o ano passado e janeiro contra dezembro). today e o dia da
     * loja (America/Fortaleza), usado para o mes corrente e as projecoes.
     */
    public record ExecutiveOverview(int year, LocalDate today, LocalDate from, LocalDate to, AnnualGoal annualGoal,
                                    List<MonthGoal> monthlyGoals, List<Person> people, List<CategoryRef> categories,
                                    List<Product> products, List<SaleFact> sales, List<RefundFact> refunds,
                                    OffsetDateTime generatedAt) { }

    public record AnnualGoalRequest(@NotNull @Min(MIN_YEAR) @Max(MAX_YEAR) Integer year, @NotNull @Valid MoneyDto amount) { }
}
