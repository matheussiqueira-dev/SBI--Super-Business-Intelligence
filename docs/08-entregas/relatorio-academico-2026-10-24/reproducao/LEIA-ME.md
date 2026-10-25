# Reprodução das verificações de banco e de contrato

Scripts usados na auditoria de 24/10/2026 sobre o commit `3b0242c` do SBI.

- `apply_migrations.sh`: cria o banco e aplica V1–V11 e `db/demo` na ordem do Flyway por `psql`.
- `run_bd_local.sh`: variante local de `docs/bd/pacote-sql/run_bd.sh`, com o `psql` fora de contêiner.

Exemplo com um PostgreSQL local (autenticação `trust` apenas no socket local, ambiente descartável):

```bash
export PGHOST=/caminho/do/socket PGPORT=15432 PGUSER=postgres_test
./apply_migrations.sh /caminho/do/repositorio order_management_test
cp run_bd_local.sh /caminho/do/repositorio/docs/bd/pacote-sql/
cd /caminho/do/repositorio/docs/bd/pacote-sql
DB=order_management_test SUPERUSER=postgres_test bash run_bd_local.sh   # esperado: PASS 61, FAIL 0
```

O script `03_rbac.sql`, executado pelo `run_bd_local.sh`, cria logins de banco sem senha para a demonstração de RLS. Use somente em banco local descartável.
