# SBI v2 — Acessibilidade

Referência: WCAG 2.2, nível AA (W3C, 2024). Este documento separa o que foi **medido** na identidade v2 do que **depende da implementação** no código do SBI.

## Resultados medidos

| Item | Critério | Método | Resultado |
|---|---|---|---|
| Contraste de texto | 1.4.3 (AA) | Razão de luminância relativa, 25 pares por tema | Menor razão: 4,69:1 (claro) e 4,84:1 (escuro) |
| Contraste de componentes e foco | 1.4.11 e 2.4.7 (AA) | Mesma fórmula, 13 pares por tema | Menor razão: 3,21:1 (claro) e 3,31:1 (escuro) |
| Total de pares | — | `contraste.csv` | **78 de 78 aprovados** |
| Uso de cor | 1.4.1 (A) | Inspeção dos componentes e simulação de daltonismo | Estados com ícone e texto; séries com legenda e tabela |
| Tamanho do alvo | 2.5.8 (AA) | Medição dos tokens | Controles de 32 a 48 px; itens de menu de 40 px (44 px em tela de toque) |
| Foco visível | 2.4.7 (AA) | Inspeção dos estados | Anel de 2 px em Petróleo, afastado 2 px do componente |
| Movimento | 2.3.3 (AAA, recomendação) | `tokens.css` | Durações zeradas com `prefers-reduced-motion: reduce` |

## Pendente de verificação no código

| Item | Critério | Como verificar |
|---|---|---|
| Refluxo | 1.4.10 (AA) | Abrir as telas a 320 px de largura: nenhuma rolagem horizontal, exceto tabelas com rolagem própria |
| Espaçamento de texto | 1.4.12 (AA) | Aplicar o CSS de teste da WCAG (altura de linha 1,5, espaço entre parágrafos 2×) e conferir cortes |
| Foco não encoberto | 2.4.11 (AA) | Navegar por teclado com a barra superior fixa no celular |
| Leitores de tela | 4.1.2 e 4.1.3 (A/AA) | NVDA e VoiceOver: etapas do PDV, selos, avisos e diálogos |
| Teste com pessoas | — | Roteiro do relatório de usabilidade: 5 participantes, 7 tarefas |

A identidade v1.0 tinha 0 violações do axe nas 17 capturas oficiais (decisão D-PUB-07). Ao aplicar a v2, a suíte E2E com axe deve ser executada novamente nos dois temas.

## Daltonismo

As cores foram simuladas para protanopia, deuteranopia e tritanopia (Machado; Oliveira; Fernandes, 2009). Na deuteranopia, o verde de sucesso e o âmbar de atenção ficam próximos; por isso nenhum estado é comunicado só por cor. A paleta categórica de dados mantém ΔE ≥ 8 entre cores vizinhas nos dois temas.

## Regras para cada tela nova

- [ ] Cores só por tokens semânticos; nenhum hexadecimal solto.
- [ ] Tarefa completa só com teclado, com foco sempre visível.
- [ ] Ordem de leitura igual à ordem visual.
- [ ] Estado com ícone e texto; gráfico com tabela equivalente (“Ver dados em tabela”).
- [ ] Rótulo de campo sempre visível; erro ligado ao campo por `aria-describedby`.
- [ ] Teste a 320 px de largura e com zoom de 200%.
- [ ] Botão só com ícone tem `aria-label`; ícone decorativo tem `aria-hidden="true"`.
- [ ] Valor ausente aparece como “Não informado”, nunca como zero.

## Referências

- WORLD WIDE WEB CONSORTIUM. **Web Content Accessibility Guidelines (WCAG) 2.2**. W3C Recommendation, 12 dez. 2024. Disponível em: https://www.w3.org/TR/WCAG22/. Acesso em: 24 out. 2026.
- MACHADO, Gustavo M.; OLIVEIRA, Manuel M.; FERNANDES, Leandro A. F. A physiologically-based model for simulation of color vision deficiency. **IEEE Transactions on Visualization and Computer Graphics**, v. 15, n. 6, p. 1291-1298, 2009. DOI: https://doi.org/10.1109/TVCG.2009.113.
