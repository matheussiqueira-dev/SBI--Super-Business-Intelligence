// Schemas dos recursos que ficam FORA do contrato alvo v6: projecao do mes, alerta de margem e
// sugestao de produto. Os schemas de lib/api/generated saem do proprio documento v6 (orval), entao
// nao cobrem caminho novo - e o documento v6 e a linha de base acordada, que esta alteracao nao
// reescreve. Por isso estes schemas sao escritos a mao, aqui, com a mesma severidade (strictObject).
import { z } from 'zod';

const dinheiro = z.strictObject({ amount: z.number(), currency: z.literal('BRL') });
const mes = /^\d{4}-(0[1-9]|1[0-2])$/;
const estadoMeta = z.enum(['SEM_META', 'EM_ANDAMENTO', 'META_ATINGIDA']);

/** GET /management/projection?period=AAAA-MM (GERENTE). */
export const MonthProjectionResponse = z.strictObject({
  period: z.string().regex(mes),
  storeGoal: dinheiro,
  realized: dinheiro,
  projected: dinheiro,
  gapToGoal: dinheiro,
  projectedAchievementPercent: z.number().nullable(),
  dailyAverage: dinheiro,
  neededPerRemainingDay: dinheiro,
  elapsedDays: z.number().int(),
  daysInMonth: z.number().int(),
  remainingDays: z.number().int(),
  anchoredOnPreviousMonth: z.boolean(),
  projectedState: estadoMeta,
});
export type MonthProjection = z.infer<typeof MonthProjectionResponse>;

/** Nivel na escala de estado em graficos do manual v2.1 (secao 29). */
export const MARGIN_LEVELS = ['BOM', 'ATENCAO', 'SERIO', 'CRITICO'] as const;

/** GET /analytics/margin-alerts?month=AAAA-MM (GERENTE e, pela hierarquia, CEO). */
export const MarginAlertResponse = z.strictObject({
  month: z.string().regex(mes),
  storeMarginPercent: z.number().nullable(),
  storeNetRevenue: dinheiro,
  storeGrossMargin: dinheiro,
  productsConsidered: z.number().int(),
  productsWithoutCost: z.number().int(),
  pressured: z.array(z.strictObject({
    productId: z.number().int(),
    name: z.string(),
    units: z.number().int(),
    netRevenue: dinheiro,
    grossMargin: dinheiro,
    marginPercent: z.number(),
    pointsBelowStore: z.number(),
    level: z.enum(MARGIN_LEVELS),
    itemsWithoutCost: z.number().int(),
  })),
});
export type MarginAlert = z.infer<typeof MarginAlertResponse>;

/** GET /performance/me/suggestions?period=AAAA-MM (VENDEDOR). */
export const SellerSuggestionsResponse = z.strictObject({
  period: z.string().regex(mes),
  seller: z.strictObject({ id: z.number().int(), name: z.string() }),
  suggestions: z.array(z.strictObject({
    productId: z.number().int(),
    sku: z.string(),
    name: z.string(),
    category: z.string().nullable(),
    price: dinheiro,
    available: z.number().int(),
    unitsSoldByMe: z.number().int(),
    lastSoldByMe: z.string().nullable(),
  })),
});
export type SellerSuggestions = z.infer<typeof SellerSuggestionsResponse>;
