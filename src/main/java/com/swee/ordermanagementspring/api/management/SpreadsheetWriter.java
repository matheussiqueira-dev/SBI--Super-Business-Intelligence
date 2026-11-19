package com.swee.ordermanagementspring.api.management;

import com.swee.ordermanagementspring.api.management.ExportDtos.ExportFormat;
import com.swee.ordermanagementspring.api.management.ExportDtos.ExportModel;
import com.swee.ordermanagementspring.api.management.ExportDtos.GoalRow;
import com.swee.ordermanagementspring.api.management.ExportDtos.SaleRow;
import com.swee.ordermanagementspring.api.management.ExportDtos.Totals;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Escreve o recorte de /analytics/export como .xlsx (XSSF), .xls real (HSSF/BIFF8) ou CSV (D-EVO-55).
 *
 * Decisoes que a banca pode conferir abrindo o arquivo:
 *  - data vai como CELULA DE DATA (formato dd/mm/aaaa), nao como texto;
 *  - dinheiro e percentual vao como NUMERO com formato do Excel ("#,##0.00" e "0.0%"), nao como texto,
 *    e SEM simbolo de moeda: o que decide como os separadores aparecem e o locale de quem abre o arquivo;
 *  - texto vai como celula de texto: no formato Excel uma celula de texto nunca e avaliada como formula,
 *    entao nome de produto ou de cliente comecando com "=", "+", "-" ou "@" nao executa nada. No CSV,
 *    que e texto puro, esses valores recebem um apostrofo de guarda e escape de aspas;
 *  - "Nao informado" aparece onde falta custo ou margem; nunca zero inventado (C-20);
 *  - o grao do detalhe esta escrito na propria aba Vendas.
 */
@Component
public class SpreadsheetWriter {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String NOT_INFORMED = "Nao informado";

    private static final String[] SALES_HEADER = {
            "Data", "Tipo", "Pedido", "Forma de pagamento", "Cliente", "Vendedor", "Equipe", "SKU", "Produto",
            "Categoria", "Unidades", "Preco unitario", "Desconto", "Receita liquida", "Custo", "Margem" };
    private static final String[] GOALS_HEADER = {
            "Mes", "Escopo", "Vendedor", "Equipe", "Meta", "Realizado", "Atingimento", "Falta", "Situacao" };

    public byte[] write(ExportModel model, ExportFormat format) {
        return format == ExportFormat.CSV ? csv(model) : workbook(model, format);
    }

    // ------------------------------------------------------------------ Excel

    private byte[] workbook(ExportModel model, ExportFormat format) {
        try (Workbook wb = format == ExportFormat.XLS ? new HSSFWorkbook() : new XSSFWorkbook();
             var out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(wb);
            summarySheet(wb, styles, model);
            // A aba so entra quando tem dado para o papel e para o recorte (secao 6 do enunciado).
            if (!model.sales().isEmpty()) salesSheet(wb, styles, model);
            if (!model.goals().isEmpty()) goalsSheet(wb, styles, model);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gerar a planilha de analises", e);
        }
    }

    private void summarySheet(Workbook wb, Styles s, ExportModel m) {
        Sheet sheet = wb.createSheet("Resumo");
        int r = 0;
        r = title(sheet, s, r, "SBI - Analises");

        // Area identificavel do recorte: periodo, fuso, filtros e quem pediu. Fica no topo, antes dos numeros.
        r = section(sheet, s, r, "Recorte do arquivo");
        r = pair(sheet, s, r, "Periodo inicial", m.period().from(), s.date);
        r = pair(sheet, s, r, "Periodo final", m.period().to(), s.date);
        r = pairText(sheet, s, r, "Fuso horario da loja", m.timeZone());
        r = pairText(sheet, s, r, "Gerado em", STAMP.format(m.generatedAt()));
        r = pairText(sheet, s, r, "Gerado por", m.requestedBy() + " (" + m.requestedByRole() + ")");
        r = pairText(sheet, s, r, "Filtro de vendedor", m.filters().sellerName() == null ? "Todos" : m.filters().sellerName());
        r = pairText(sheet, s, r, "Filtro de categoria", m.filters().categoryName() == null ? "Todas" : m.filters().categoryName());
        r = pairText(sheet, s, r, "Filtro de pagamento", m.filters().paymentMethod() == null ? "Todas" : m.filters().paymentMethod());
        r++;

        Totals t = m.totals();
        r = section(sheet, s, r, "Faturamento confirmado (pagamento aprovado menos estorno)");
        r = pair(sheet, s, r, "Pedidos pagos", BigDecimal.valueOf(t.paidOrders()), s.integer);
        r = pair(sheet, s, r, "Itens vendidos", BigDecimal.valueOf(t.items()), s.integer);
        r = pair(sheet, s, r, "Unidades", BigDecimal.valueOf(t.units()), s.integer);
        // receita_liquida da view ja desconta o desconto do item; o desconto vai ao lado como informacao,
        // nao como parcela a somar. O rotulo diz isso, para ninguem tentar somar os dois.
        r = pair(sheet, s, r, "Receita das vendas (ja sem desconto)", t.grossRevenue(), s.money);
        r = pair(sheet, s, r, "Descontos concedidos (ja descontados acima)", t.discounts(), s.money);
        r = pair(sheet, s, r, "Estornos", t.refunds(), s.money);
        r = pair(sheet, s, r, "Faturamento confirmado", t.netRevenue(), s.moneyBold);
        r = pair(sheet, s, r, "Ticket medio por pedido", t.averageTicket(), s.money);
        r++;

        r = section(sheet, s, r, "Custo e margem");
        r = pair(sheet, s, r, "Custo dos itens vendidos", t.cost(), s.money);
        r = pair(sheet, s, r, "Margem bruta", t.margin(), s.money);
        r = pairPercent(sheet, s, r, "Margem sobre o faturamento", t.marginPercent());
        r = pair(sheet, s, r, "Itens vendidos sem custo informado", BigDecimal.valueOf(t.itemsWithoutCost()), s.integer);
        r++;

        r = section(sheet, s, r, "Meta do periodo");
        if (t.goalNote() != null) {
            // Comparacao que nao seria honesta nao vira percentual: vira o motivo, por extenso.
            r = note(sheet, s, r, t.goalNote());
        } else {
            r = pair(sheet, s, r, "Plano da loja nos meses do periodo", t.periodGoal(), s.money);
            r = pairPercent(sheet, s, r, "Atingimento do plano", t.goalAchievementPercent());
        }
        r++;

        r = section(sheet, s, r, "Como reconciliar");
        r = note(sheet, s, r, "A aba Vendas esta no grao do ITEM de pedido, com uma linha por estorno "
                + "(Tipo = ESTORNO, receita negativa).");
        r = note(sheet, s, r, "Somar a coluna Receita liquida de TODAS as linhas da aba Vendas da o "
                + "Faturamento confirmado acima.");
        r = note(sheet, s, r, "Contar Pedido distinto com Tipo = VENDA da os Pedidos pagos acima.");
        note(sheet, s, r, "Mesma definicao do painel e do roteiro SQL (view v_lancamento_realizado).");

        sheet.setColumnWidth(0, 14_000);
        sheet.setColumnWidth(1, 7_000);
    }

    private void salesSheet(Workbook wb, Styles s, ExportModel m) {
        Sheet sheet = wb.createSheet("Vendas");
        int r = 0;
        r = title(sheet, s, r, "Vendas - grao do item de pedido (uma linha por estorno)");
        r = note(sheet, s, r, "Periodo " + DAY.format(m.period().from()) + " a " + DAY.format(m.period().to())
                + " - " + m.timeZone() + " - " + filtersLabel(m));
        r++;

        int headerRow = r;
        Row header = sheet.createRow(r++);
        for (int c = 0; c < SALES_HEADER.length; c++) text(header, c, SALES_HEADER[c], s.header);

        for (SaleRow row : m.sales()) {
            Row line = sheet.createRow(r++);
            date(line, 0, row.date(), s.date);
            text(line, 1, row.kind(), s.textCell);
            number(line, 2, BigDecimal.valueOf(row.orderId()), s.integer);
            text(line, 3, row.paymentMethod(), s.textCell);
            text(line, 4, row.customer(), s.textCell);
            text(line, 5, row.seller(), s.textCell);
            text(line, 6, row.team(), s.textCell);
            text(line, 7, row.sku() == null ? "-" : row.sku(), s.textCell);
            text(line, 8, row.product(), s.textCell);
            text(line, 9, row.category() == null ? "-" : row.category(), s.textCell);
            if (row.units() == null) text(line, 10, "-", s.textRight); else number(line, 10, BigDecimal.valueOf(row.units()), s.integer);
            moneyOrLabel(line, 11, row.unitPrice(), s, "-");
            moneyOrLabel(line, 12, row.discount(), s, "-");
            number(line, 13, row.netRevenue(), s.money);
            moneyOrLabel(line, 14, row.cost(), s, NOT_INFORMED);
            moneyOrLabel(line, 15, row.margin(), s, NOT_INFORMED);
        }

        // Linha de total: conferencia imediata contra o Resumo, calculada aqui (sem formula no arquivo).
        Row total = sheet.createRow(r + 1);
        text(total, 0, "Total do recorte", s.header);
        text(total, 12, "Faturamento confirmado", s.header);
        number(total, 13, m.totals().netRevenue(), s.moneyBold);

        autosize(sheet, SALES_HEADER.length);
        // Congela ABAIXO do cabecalho (headerRow + 1). Fixar em headerRow deixaria a propria linha de
        // cabecalho rolar para fora da vista, e qualquer nota nova acima dela quebraria um numero fixo.
        sheet.createFreezePane(0, headerRow + 1);
    }

    private void goalsSheet(Workbook wb, Styles s, ExportModel m) {
        Sheet sheet = wb.createSheet("Metas");
        int r = 0;
        r = title(sheet, s, r, "Metas e realizado por mes");
        r = note(sheet, s, r, "Escopo Loja = plano do mes; Escopo Vendedor = distribuicao individual. "
                + "A soma das metas dos vendedores fecha com o plano da loja.");
        r = note(sheet, s, r, "O realizado da loja inclui a venda do gerente, que nao tem meta individual.");
        // A meta e sempre do mes inteiro e da loja inteira: esta aba nao segue o recorte parcial nem os
        // filtros de categoria e pagamento da aba Vendas. Dizer isso aqui evita o arquivo parecer que se
        // contradiz quando o Resumo esta filtrado.
        r = note(sheet, s, r, "Atencao ao comparar com a aba Vendas: esta aba e sempre do MES INTEIRO e, "
                + "fora o filtro de vendedor, da LOJA INTEIRA. Ela nao segue o recorte parcial do periodo "
                + "nem os filtros de categoria e de forma de pagamento.");
        r++;

        int headerRow = r;
        Row header = sheet.createRow(r++);
        for (int c = 0; c < GOALS_HEADER.length; c++) text(header, c, GOALS_HEADER[c], s.header);

        for (GoalRow row : m.goals()) {
            Row line = sheet.createRow(r++);
            text(line, 0, row.period(), s.textCell);
            text(line, 1, row.scope(), s.textCell);
            text(line, 2, row.seller(), s.textCell);
            text(line, 3, row.team(), s.textCell);
            number(line, 4, row.goal(), s.money);
            number(line, 5, row.realized(), s.money);
            if (row.achievementPercent() == null) text(line, 6, "Sem meta", s.textRight);
            else number(line, 6, row.achievementPercent().divide(BigDecimal.valueOf(100)), s.percent);
            number(line, 7, row.remaining(), s.money);
            text(line, 8, row.state(), s.textCell);
        }
        autosize(sheet, GOALS_HEADER.length);
        sheet.createFreezePane(0, headerRow + 1);
    }

    // ------------------------------------------------------------------ CSV

    /**
     * CSV complementar: separador ";" e virgula decimal, como o Excel em portugues abre direto; BOM UTF-8.
     * Mesmas linhas e mesmos totais das abas; os blocos vem na ordem Resumo, Vendas, Metas.
     */
    private byte[] csv(ExportModel m) {
        StringBuilder sb = new StringBuilder("﻿");
        Totals t = m.totals();
        sb.append("SBI - Analises\n");
        line(sb, "Periodo inicial", DAY.format(m.period().from()));
        line(sb, "Periodo final", DAY.format(m.period().to()));
        line(sb, "Fuso horario da loja", m.timeZone());
        line(sb, "Gerado em", STAMP.format(m.generatedAt()));
        lineFromDb(sb, "Gerado por", m.requestedBy() + " (" + m.requestedByRole() + ")");
        lineFromDb(sb, "Filtros", filtersLabel(m));
        line(sb, "Pedidos pagos", String.valueOf(t.paidOrders()));
        line(sb, "Itens vendidos", String.valueOf(t.items()));
        line(sb, "Unidades", String.valueOf(t.units()));
        line(sb, "Receita das vendas (ja sem desconto)", decimal(t.grossRevenue()));
        line(sb, "Descontos concedidos (ja descontados acima)", decimal(t.discounts()));
        line(sb, "Estornos", decimal(t.refunds()));
        line(sb, "Faturamento confirmado", decimal(t.netRevenue()));
        line(sb, "Ticket medio por pedido", decimalOrLabel(t.averageTicket()));
        line(sb, "Custo dos itens vendidos", decimalOrLabel(t.cost()));
        line(sb, "Margem bruta", decimalOrLabel(t.margin()));
        line(sb, "Margem sobre o faturamento (%)", decimalOrLabel(t.marginPercent()));
        if (t.goalNote() != null) {
            line(sb, "Meta do periodo", t.goalNote());
        } else {
            line(sb, "Plano da loja no periodo", decimal(t.periodGoal()));
            line(sb, "Atingimento do plano (%)", decimal(t.goalAchievementPercent()));
        }

        sb.append("\nVendas (grao do item de pedido; uma linha por estorno)\n");
        sb.append(String.join(";", SALES_HEADER)).append('\n');
        for (SaleRow row : m.sales()) {
            sb.append(String.join(";", List.of(
                    DAY.format(row.date()), fixed(row.kind()), String.valueOf(row.orderId()), fixed(row.paymentMethod()),
                    cell(row.customer()), cell(row.seller()), cell(row.team()),
                    row.sku() == null ? "-" : cell(row.sku()),
                    cell(row.product()), row.category() == null ? "-" : cell(row.category()),
                    row.units() == null ? "-" : String.valueOf(row.units()),
                    decimal(row.unitPrice()), decimal(row.discount()), decimal(row.netRevenue()),
                    row.cost() == null ? NOT_INFORMED : decimal(row.cost()),
                    row.margin() == null ? NOT_INFORMED : decimal(row.margin())))).append('\n');
        }

        sb.append("\nMetas e realizado por mes\n");
        sb.append(String.join(";", GOALS_HEADER)).append('\n');
        for (GoalRow row : m.goals()) {
            sb.append(String.join(";", List.of(
                    fixed(row.period()), fixed(row.scope()), cell(row.seller()), cell(row.team()),
                    decimal(row.goal()), decimal(row.realized()),
                    row.achievementPercent() == null ? "Sem meta" : decimal(row.achievementPercent()),
                    decimal(row.remaining()), fixed(row.state())))).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Linha "rotulo;valor" do bloco Resumo. Rotulo e valor sao gerados aqui, entao vao sem guarda. */
    private static void line(StringBuilder sb, String label, String value) {
        sb.append(fixed(label)).append(';').append(fixed(value == null ? NOT_INFORMED : value)).append('\n');
    }

    /** Mesma linha, para valor que vem do banco (nome de pessoa, de vendedor, de categoria). */
    private static void lineFromDb(StringBuilder sb, String label, String value) {
        sb.append(fixed(label)).append(';').append(cell(value == null ? NOT_INFORMED : value)).append('\n');
    }

    /** Numero em pt-BR (virgula decimal). Vazio quando o valor nao existe, para nao inventar zero. */
    private static String decimal(BigDecimal value) {
        return value == null ? "" : value.toPlainString().replace('.', ',');
    }

    /** Mesmo numero, mas dizendo "Nao informado" quando nao existe: usado no bloco Resumo do CSV, que e
     *  lido por pessoa e nao por formula, igual ao que a aba Resumo escreve. */
    private static String decimalOrLabel(BigDecimal value) {
        return value == null ? NOT_INFORMED : decimal(value);
    }

    /**
     * Escape do CSV com protecao contra formula, para TEXTO VINDO DO BANCO (nome de produto, de cliente, de
     * pessoa, de categoria): valor que comeca com =, +, -, @, TAB ou CR recebe um apostrofo de guarda, porque
     * o Excel avalia esses prefixos como formula ao abrir um arquivo de texto.
     *
     * Nao use em valor gerado pelo servidor: a guarda em cima de um numero negativo ("-3241,70") transformaria
     * o total em texto, e a planilha deixaria de somar. Para esses, {@link #fixed(String)}.
     */
    static String cell(String value) {
        if (value == null || value.isEmpty()) return "";
        String safe = value;
        char first = safe.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
            safe = "'" + safe;
        }
        return fixed(safe);
    }

    /** Escape do CSV, sem guarda: para o que o servidor mesmo gerou (data, numero, rotulo fixo, enum). */
    static String fixed(String value) {
        if (value == null || value.isEmpty()) return "";
        return value.matches("(?s).*[\";\n\r].*") ? '"' + value.replace("\"", "\"\"") + '"' : value;
    }

    // ------------------------------------------------------------------ celulas

    /** Recorte por extenso, uma definicao so, compartilhada com o motivo da comparacao nao feita. */
    private static String filtersLabel(ExportModel m) {
        return m.filters().describe();
    }

    private static int title(Sheet sheet, Styles s, int r, String value) {
        text(sheet.createRow(r), 0, value, s.title);
        return r + 2;
    }

    private static int section(Sheet sheet, Styles s, int r, String value) {
        text(sheet.createRow(r), 0, value, s.header);
        return r + 1;
    }

    private static int note(Sheet sheet, Styles s, int r, String value) {
        text(sheet.createRow(r), 0, value, s.textCell);
        return r + 1;
    }

    private static int pairText(Sheet sheet, Styles s, int r, String label, String value) {
        Row row = sheet.createRow(r);
        text(row, 0, label, s.label);
        text(row, 1, value == null ? NOT_INFORMED : value, s.textCell);
        return r + 1;
    }

    private static int pair(Sheet sheet, Styles s, int r, String label, Object value, CellStyle style) {
        Row row = sheet.createRow(r);
        text(row, 0, label, s.label);
        if (value == null) text(row, 1, NOT_INFORMED, s.textRight);
        else if (value instanceof BigDecimal n) number(row, 1, n, style);
        else if (value instanceof java.time.LocalDate d) date(row, 1, d, style);
        return r + 1;
    }

    private static int pairPercent(Sheet sheet, Styles s, int r, String label, BigDecimal percent) {
        Row row = sheet.createRow(r);
        text(row, 0, label, s.label);
        if (percent == null) text(row, 1, NOT_INFORMED, s.textRight);
        else number(row, 1, percent.divide(BigDecimal.valueOf(100)), s.percent);
        return r + 1;
    }

    private static void moneyOrLabel(Row row, int column, BigDecimal value, Styles s, String label) {
        if (value == null) text(row, column, label, s.textRight); else number(row, column, value, s.money);
    }

    /** Celula de texto: no formato Excel nunca e avaliada como formula, qualquer que seja o prefixo. */
    private static void text(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
    }

    private static void number(Row row, int column, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value == null) cell.setBlank(); else cell.setCellValue(value.doubleValue());
        cell.setCellStyle(style);
    }

    private static void date(Row row, int column, java.time.LocalDate value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value == null) cell.setBlank(); else cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private static void autosize(Sheet sheet, int columns) {
        // autoSizeColumn e caro em planilha grande; largura fixa legivel resolve o caso da apresentacao.
        for (int c = 0; c < columns; c++) sheet.setColumnWidth(c, c == 8 ? 12_000 : 4_600);
    }

    /** Estilos do arquivo. Sem cor de marca: a planilha e um anexo, nao uma tela (manual, secao 36). */
    private static final class Styles {
        private final CellStyle title;
        private final CellStyle header;
        private final CellStyle label;
        private final CellStyle textCell;
        private final CellStyle textRight;
        private final CellStyle money;
        private final CellStyle moneyBold;
        private final CellStyle integer;
        private final CellStyle percent;
        private final CellStyle date;

        private Styles(Workbook wb) {
            CreationHelper helper = wb.getCreationHelper();
            Font bold = wb.createFont();
            bold.setBold(true);
            Font big = wb.createFont();
            big.setBold(true);
            big.setFontHeightInPoints((short) 14);

            title = wb.createCellStyle();
            title.setFont(big);
            header = wb.createCellStyle();
            header.setFont(bold);
            label = wb.createCellStyle();
            label.setFont(bold);
            textCell = wb.createCellStyle();
            textRight = wb.createCellStyle();
            textRight.setAlignment(HorizontalAlignment.RIGHT);
            // Algarismos alinhados a direita e com separador de milhar, como os indicadores da tela.
            money = wb.createCellStyle();
            money.setDataFormat(helper.createDataFormat().getFormat("#,##0.00"));
            moneyBold = wb.createCellStyle();
            moneyBold.setDataFormat(helper.createDataFormat().getFormat("#,##0.00"));
            moneyBold.setFont(bold);
            integer = wb.createCellStyle();
            integer.setDataFormat(helper.createDataFormat().getFormat("#,##0"));
            percent = wb.createCellStyle();
            percent.setDataFormat(helper.createDataFormat().getFormat("0.0%"));
            date = wb.createCellStyle();
            date.setDataFormat(helper.createDataFormat().getFormat("dd/mm/yyyy"));
        }
    }
}
