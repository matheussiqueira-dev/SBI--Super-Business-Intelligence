package db.demo;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.PreparedStatement;
import java.util.List;

/**
 * Perfil demo (D-EVO-46): contas de CEO dos professores avaliadores e as equipes de venda da V12. Mesma regra de
 * senha da V6_1: a variavel propria da conta (SBI_DEMO_PASSWORD_PAULO etc.) ou, sem ela, a comum SBI_DEMO_PASSWORD;
 * sem nenhuma das duas, a migracao falha. Grava so o BCrypt(12); nenhuma senha fica no repositorio.
 * As equipes sao achadas pelo db_role, que nao muda quando o ambiente publicado renomeia nome e e-mail.
 */
public class V12_1__ExecutiveAccounts extends BaseJavaMigration {

    static final List<V6_1__DemoAccounts.Account> ACCOUNTS = List.of(
            new V6_1__DemoAccounts.Account("Paulo Thiago Gomes da Silva", "paulo@sbi.tech", "CEO", "ceo_paulo",
                    V6_1__DemoAccounts.PASSWORD_VARIABLE + "_PAULO"),
            new V6_1__DemoAccounts.Account("Christian Felix Gbedande Azonyetin", "christian@sbi.tech", "CEO", "ceo_christian",
                    V6_1__DemoAccounts.PASSWORD_VARIABLE + "_CHRISTIAN"),
            new V6_1__DemoAccounts.Account("Bruno Marciano de Amorim Josino", "bruno@sbi.tech", "CEO", "ceo_bruno",
                    V6_1__DemoAccounts.PASSWORD_VARIABLE + "_BRUNO"));

    /** Equipes da demonstracao: cada gerente responde por um vendedor (db_role do vendedor, db_role do gerente). */
    static final List<String[]> TEAMS = List.of(
            new String[] {"vendedor_allan", "gerente_matheus"},
            new String[] {"vendedor_francisco", "gerente_gabriel"});

    @Override
    public void migrate(Context context) throws Exception {
        var encoder = new BCryptPasswordEncoder(12);
        String sql = "INSERT INTO app_users(name, email, password_hash, role, db_role) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement insert = context.getConnection().prepareStatement(sql)) {
            for (var account : ACCOUNTS) {
                insert.setString(1, account.name());
                insert.setString(2, account.email());
                insert.setString(3, encoder.encode(V6_1__DemoAccounts.passwordFor(account, System::getenv)));
                insert.setString(4, account.role());
                insert.setString(5, account.dbRole());
                insert.addBatch();
            }
            insert.executeBatch();
        }
        String team = """
                UPDATE app_users s SET manager_id = m.id
                  FROM app_users m
                 WHERE s.db_role = ? AND s.role = 'VENDEDOR' AND m.db_role = ? AND m.role = 'GERENTE' AND m.active""";
        try (PreparedStatement update = context.getConnection().prepareStatement(team)) {
            for (String[] pair : TEAMS) {
                update.setString(1, pair[0]);
                update.setString(2, pair[1]);
                update.addBatch();
            }
            update.executeBatch();
        }
    }
}
