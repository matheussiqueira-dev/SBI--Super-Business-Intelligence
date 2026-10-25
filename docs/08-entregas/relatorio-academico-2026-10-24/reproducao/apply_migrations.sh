#!/usr/bin/env bash
# Aplica as migracoes V1..V11 e a massa demo (db/demo) na ordem de versao do Flyway, sem a JVM.
# Substitui ${flyway:defaultSchema} por public e executa cada arquivo em uma transacao (psql -1).
# A migracao Java V6_1__DemoAccounts e substituida por INSERT equivalente com BCrypt(12) de senha aleatoria.
# Uso: PGHOST=<socket ou host> PGPORT=<porta> PGUSER=<superusuario> ./apply_migrations.sh <repositorio> <banco>
# Requisitos: psql, python3 com o pacote bcrypt.
set -euo pipefail
REPO="$1"; DB="$2"
PSQL="psql -X -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
M="$REPO/src/main/resources/db/migration"; D="$REPO/src/main/resources/db/demo"
apply() { sed 's/\${flyway:defaultSchema}/public/g' "$1" | $PSQL -1 -d "$DB" -f - > /dev/null; echo "aplicado: $(basename "$1")"; }
for v in V1__legacy_schema V2__users_and_order_authorship V3__rename_client_to_customer V4__money_numeric \
         V5__catalogo_estoque_metas_promocoes V6__views_dashboards; do apply "$M/$v.sql"; done
PW="$(python3 -c 'import secrets;print(secrets.token_urlsafe(16))')"
python3 - "$PW" <<'PY' | $PSQL -1 -d "$DB" -f - > /dev/null
import sys, bcrypt
pw = sys.argv[1].encode()
acc = [("Matheus Siqueira", "matheussiqueira@sbi.tech", "GERENTE", "gerente_matheus"),
       ("Allan Barros", "allanbarros@sbi.tech", "VENDEDOR", "vendedor_allan"),
       ("Francisco Ferreira", "franciscoferreira@sbi.tech", "VENDEDOR", "vendedor_francisco"),
       ("Gabriel Sousa", "gabrielsousa@sbi.tech", "GERENTE", "gerente_gabriel")]
print("INSERT INTO app_users(name,email,password_hash,role,db_role) VALUES")
print(",\n".join("('%s','%s','%s','%s','%s')" % (n, e, bcrypt.hashpw(pw, bcrypt.gensalt(12, prefix=b'2a')).decode(), r, d)
                 for n, e, r, d in acc) + ";")
PY
echo "aplicado: V6_1__DemoAccounts (equivalente SQL)"
apply "$D/V6_2__demo_seed.sql"
for v in V7__mask_card_numbers V8__user_admin_and_session_version V9__customer_summary_view V10__alphanumeric_cnpj \
         V11__manual_discount; do apply "$M/$v.sql"; done
apply "$D/V11_1__demo_promotion_until_december.sql"
apply "$D/V11_2__demo_costs.sql"
