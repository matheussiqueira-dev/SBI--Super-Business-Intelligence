'use client';
// Modelo do painel executivo do ano (GET /executive/overview), compartilhado pelo painel e pela tela de metas.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GetExecutiveOverviewResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';

/** Ano corrente da loja (America/Fortaleza), antes de o servidor responder com o dia oficial. */
export function storeYear(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric' }).format(now));
}

/** Anos oferecidos no seletor: os tres ultimos. */
export function selectableYears(now: Date = new Date()): number[] {
  const year = storeYear(now);
  return [year, year - 1, year - 2];
}

export function overviewKey(year: number) {
  return ['executive', year] as const;
}

/** Atualiza a cada minuto com a aba visivel; erro nunca vira zero (os ultimos numeros bons ficam na tela). */
export function useOverview(year: number) {
  return useQuery({
    queryKey: overviewKey(year),
    queryFn: ({ signal }) => api.request(`/executive/overview?year=${year}`, { signal, schema: GetExecutiveOverviewResponse }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
