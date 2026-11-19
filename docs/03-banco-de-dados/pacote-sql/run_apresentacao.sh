#!/usr/bin/env bash
# Etapa do cenario de apresentacao (D-EVO-55/56). Roda DEPOIS de run_bd.sh e run_olist_bd.sh, para nenhum
# numero dos testes 06* e 09 mudar.
#
# Carrega o cenario DUAS vezes com a MESMA data de referencia (CT-APR-03: idempotencia), compara a fotografia
# do banco entre as duas execucoes, roda os testes 12 e, por fim, a prova de banco 11 (que precisa terminar
# sem erro inesperado: ON_ERROR_STOP esta ligado dentro dela).
#
# Uso: CONTAINER=<id do PostgreSQL> DB=<banco> SUPERUSER=<dono> [REF=AAAA-MM-DD] ./run_apresentacao.sh
# Sem CONTAINER: PostgreSQL nativo, com o psql do PATH e PGHOST/PGPORT/PGPASSWORD do ambiente.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="${CONTAINER:-}"
DB="${DB:?informe DB}"
SUPERUSER="${SUPERUSER:?informe SUPERUSER}"
OUT="${OUT:-$DIR/resultado_apresentacao.txt}"
PROVA_OUT="${PROVA_OUT:-$DIR/resultado_prova_banco.txt}"
# CT-APR-00 a CT-APR-14 (12_testes_apresentacao.sql) + CT-APR-15 (fotografia igual) + CT-APR-16 (prova 11).
EXPECTED_PASS=17

if [ -n "$CONTAINER" ]; then
  # O caminho vai dentro de uma string para o shell do container: no Git Bash o docker.exe converteria
  # /tmp/... para um caminho do Windows se ele fosse um argumento solto.
  docker exec "$CONTAINER" sh -lc 'rm -rf /tmp/pacote-sql'
  # No Windows (Git Bash) o docker.exe precisa do caminho de origem no formato do Windows.
  SRC="$DIR"; if command -v cygpath > /dev/null 2>&1; then SRC="$(cygpath -w "$DIR")"; fi
  docker cp "$SRC" "$CONTAINER:/tmp/pacote-sql"
  # O cd vai dentro do script do shell (POSIX, com shift) em vez de -w /tmp/pacote-sql: no Git Bash o docker.exe
  # converteria o -w para um caminho do Windows e o exec falharia com "Cwd must be an absolute path".
  psql_in() {
    docker exec -i "$CONTAINER" sh -c \
      'cd /tmp/pacote-sql && u=$1 && d=$2 && shift 2 && exec psql -X -q -U "$u" -d "$d" "$@"' \
      sh "$SUPERUSER" "$DB" "$@"
  }
else
  # Instalacao nativa: o psql roda na maquina e os caminhos relativos saem deste diretorio.
  psql_in() { (cd "$DIR" && psql -X -q -w -U "$SUPERUSER" -d "$DB" "$@"); }
fi

# Referencia fixa nas duas execucoes: sem isso a comparacao compararia dois recortes diferentes.
REF="${REF:-$(psql_in -Atc "SELECT (now() AT TIME ZONE 'America/Fortaleza')::date")}"

# Fotografia do banco: as contagens e os totais que a carga tem de deixar iguais.
SNAPSHOT="SELECT (SELECT count(*) FROM orders), (SELECT count(*) FROM order_item), (SELECT count(*) FROM payment),
                 (SELECT count(*) FROM refund), (SELECT count(*) FROM monthly_goal), (SELECT count(*) FROM seller_goal),
                 (SELECT coalesce(sum(amount),0) FROM annual_goal),
                 (SELECT coalesce(sum(valor),0) FROM v_lancamento_realizado),
                 (SELECT coalesce(sum(on_hand),0) FROM stock_balance),
                 (SELECT coalesce(sum(reserved),0) FROM stock_balance)"

: > "$OUT"
echo "NOTICE:  data de referencia do cenario: $REF" >> "$OUT"
psql_in -v ON_ERROR_STOP=1 -v "ref=$REF" -f 10_carga_apresentacao.sql >> "$OUT" 2>&1
PRIMEIRA="$(psql_in -Atc "$SNAPSHOT")"
psql_in -v ON_ERROR_STOP=1 -v "ref=$REF" -f 10_carga_apresentacao.sql >> "$OUT" 2>&1
SEGUNDA="$(psql_in -Atc "$SNAPSHOT")"

if [ "$PRIMEIRA" = "$SEGUNDA" ]; then
  echo "NOTICE:  PASS CT-APR-15 carga repetida deixa a mesma fotografia ($PRIMEIRA)" >> "$OUT"
else
  echo "NOTICE:  FAIL CT-APR-15 carga repetida mudou a fotografia: [$PRIMEIRA] -> [$SEGUNDA]" >> "$OUT"
fi

psql_in -f 12_testes_apresentacao.sql >> "$OUT" 2>&1 || true

# Prova de banco: tem de terminar sem erro inesperado (as recusas esperadas ficam em blocos com EXCEPTION).
if psql_in -v ON_ERROR_STOP=1 -f 11_prova_banco.sql > "$PROVA_OUT" 2>&1; then
  echo "NOTICE:  PASS CT-APR-16 prova de banco 11 completa, sem erro inesperado" >> "$OUT"
  # O psql prefixa todo NOTICE com "psql:<arquivo>:<linha>: ", entao ancorar em "^NOTICE:" nunca casava e
  # as cinco recusas de integridade ficavam de fora do resumo, em silencio (o || true engole o grep vazio).
  # O sed tira o prefixo do psql e deixa a linha no mesmo formato "NOTICE:  ..." do resto do arquivo.
  grep -E "^psql:[^:]+:[0-9]+: NOTICE:  OK [0-9]+/[0-9]+ - " "$PROVA_OUT" | sed 's/^psql:[^:]*:[0-9]*: //' >> "$OUT" || true
else
  echo "NOTICE:  FAIL CT-APR-16 prova de banco 11 abortou" >> "$OUT"
  tail -20 "$PROVA_OUT" >> "$OUT"
fi

grep -E "PASS|FAIL|ERROR|OK [0-9]+/[0-9]+ - " "$OUT" | sed 's/^.*NOTICE:  //'
PASS=$(grep -c "PASS" "$OUT" || true)
FAIL=$(grep -c "FAIL" "$OUT" || true)
ERRORS=$(grep -c "ERROR" "$OUT" || true)
echo "PASS: $PASS  FAIL: $FAIL  ERROS: $ERRORS  (esperado: $EXPECTED_PASS PASS)"
[ "$FAIL" -eq 0 ] && [ "$ERRORS" -eq 0 ] && [ "$PASS" -eq "$EXPECTED_PASS" ]
