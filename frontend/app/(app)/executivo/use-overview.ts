'use client';
// Modelo do painel executivo do ano (GET /executive/overview), compartilhado pelo painel e pela tela de metas.
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetExecutiveOverviewResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';
import { useInUse } from '../../../components/use-in-use.ts';

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

/**
 * Atualiza a cada minuto com a aba visivel e em uso (10 min parada pausa, D-EVO-51); erro nunca vira zero (os ultimos
 * numeros bons ficam na tela).
 */
export function useOverview(year: number) {
  const queryClient = useQueryClient();
  const inUse = useInUse(() => void queryClient.invalidateQueries({ queryKey: ['executive'] }));
  return useQuery({
    queryKey: overviewKey(year),
    queryFn: ({ signal }) => api.request(`/executive/overview?year=${year}`, { signal, schema: GetExecutiveOverviewResponse }),
    placeholderData: keepPreviousData,
    refetchInterval: inUse ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
}
