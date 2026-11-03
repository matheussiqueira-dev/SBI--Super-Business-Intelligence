# SBI — Rebranding e identidade visual v2.2

Centro Universitário UNIFG · Projeto Acadêmico A3 — 2026 · Garantia da Qualidade de Software e Banco de Dados.

Integrantes: Allan Gabriel Almeida Barros (RA 1352524052), Gabriel Sousa Vasconcelos (RA 13526110176), Francisco Miguel de Lemos Sena Ferreira (RA 1352523939) e Matheus Henrique Dias Siqueira (RA 1352623492).

## Conteúdo

| Pasta | Conteúdo |
|---|---|
| `01-manual/` | Manual de Identidade Visual v2.2 em PDF (A4 horizontal, navegável), fonte HTML editável e as edições anteriores em `versoes-anteriores/` |
| `02-documentos/` | Resumo executivo, relatório de diagnóstico e decisões e quadro comparativo antes e depois |
| `03-marca/` | Logotipos, símbolo, monograma e assinatura em SVG e PNG |
| `04-favicon-e-icones/` | Favicon, ícones de aplicativo e PWA, manifesto e guia de implementação |
| `05-design-system/` | Tokens (JSON e CSS), componentes, fontes, avatares, guia de componentes, temas, acessibilidade e contraste |
| `06-mockups/` | Telas e aplicações em PNG (2×) e HTML |
| `07-apresentacoes/` | Modelos editáveis de apresentação (.pptx) |
| `08-pranchas/` | Prancha-síntese da marca e prancha de construção |

## Situação

A identidade v2 está documentada e aplicada a todas as telas da aplicação: tokens claro e escuro, Inter local, símbolo Encaixe, favicon, manifesto e gráficos. O ramo `feat/brand-sbi-v2` foi integrado à `main` pelo pull request nº 50 (`9831563`, 25/10/2026) e publicado na Vercel, com as verificações da integração contínua aprovadas (E2E e axe nos dois temas); os avatares entraram pelo pull request nº 47, adaptados à identidade v2. Os mockups seguem como layouts propostos, sobre rotas, regras e dados de demonstração do repositório. Os próximos passos estão na seção 39 do manual.

## Fonte editável do manual

`01-manual/fonte/manual.html` usa os arquivos de `05-design-system/` e `06-mockups/html/` por caminho relativo. Mantenha a estrutura de pastas para abrir a fonte no navegador e gerar o PDF novamente (impressão em A4 horizontal, sem margens).
