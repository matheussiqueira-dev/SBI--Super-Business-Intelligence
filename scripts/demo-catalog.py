"""Gera o catálogo estático de /demo a partir do CSV público da massa Olist."""
import argparse
import csv
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/03-banco-de-dados/pacote-sql/olist/produtos.csv"
OUTPUT = ROOT / "frontend/lib/demo/apple-catalog.ts"


def centavos(value: str) -> int:
    amount = Decimal(value) * 100
    if not amount.is_finite() or amount < 0 or amount != amount.to_integral_value():
        raise ValueError(f"Valor inválido no catálogo: {value}")
    return int(amount)


def render_catalog() -> str:
    with SOURCE.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    skus = {row["sku"] for row in rows}
    if not skus or len(skus) != len(rows) or any(not sku.startswith("OL-") for sku in skus):
        raise ValueError("O catálogo Olist deve conter SKUs OL- únicos.")
    entries = []
    for row in rows:
        price = centavos(row["preco"])
        cost = centavos(row["custo_medio_demo"])
        if not row["nome"] or not row["categoria"] or price <= 0 or cost > price:
            raise ValueError(f"Produto inválido: {row['sku']}")
        entry = [row["sku"], row["nome"], row["categoria"], price, cost]
        entries.append(f"  {json.dumps(entry, ensure_ascii=False)},")
    return "\n".join([
        "// Gerado por scripts/demo-catalog.py a partir de olist/produtos.csv.",
        "type AppleProduct = readonly [sku: string, name: string, category: string, price: number, cost: number];",
        "",
        "export const APPLE_PRODUCTS: readonly AppleProduct[] = [",
        *entries,
        "];",
        "",
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    catalog = render_catalog()
    if arguments.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != catalog:
            parser.exit(1, "Catálogo desatualizado. Execute python scripts/demo-catalog.py.\n")
        return
    OUTPUT.write_text(catalog, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
