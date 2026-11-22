// Edicao da aplicacao (plano comercial, secao 11): a mesma base de codigo serve o trabalho academico e a oferta
// comercial. A escolha e de build, pela variavel NEXT_PUBLIC_SBI_EDICAO, na mesma convencao de NEXT_PUBLIC_SBI_AQUECER.
//
//   academica (padrao) -> "/" continua levando cada perfil para a sua area e o login para quem nao tem sessao.
//   comercial          -> "/" renderiza a pagina publica da oferta, sem ler sessao e sem chamar a API do PDV.
//
// Nenhuma outra rota muda de comportamento: /entrar, /demo e as areas internas sao iguais nas duas edicoes.
// Documentado em docs/05-operacao/edicoes-e-variaveis.md.

export type Edition = 'academica' | 'comercial';

export const EDITIONS: readonly Edition[] = ['academica', 'comercial'];

export const DEFAULT_EDITION: Edition = 'academica';

/** Valor invalido ou ausente cai na edicao academica: a publicacao comercial e sempre uma escolha explicita. */
export function parseEdition(value: string | undefined | null): Edition {
  const normalized = (value ?? '').trim().toLowerCase();
  return EDITIONS.includes(normalized as Edition) ? (normalized as Edition) : DEFAULT_EDITION;
}

export const EDITION: Edition = parseEdition(process.env.NEXT_PUBLIC_SBI_EDICAO);

export const isCommercial = (edition: Edition = EDITION): boolean => edition === 'comercial';
