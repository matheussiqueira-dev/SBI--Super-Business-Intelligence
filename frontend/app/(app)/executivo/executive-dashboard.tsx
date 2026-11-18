'use client';
// Painel executivo da area autenticada: busca o modelo do ano na API e entrega para ExecutiveView desenhar.
import { useMemo, useState } from 'react';
import { Model } from '../../../lib/executive.ts';
import { ExecutiveView } from '../../../components/executive-view.tsx';
import { selectableYears, storeYear, useOverview } from './use-overview.ts';

export default function ExecutiveDashboard() {
  const [year, setYear] = useState(storeYear);
  const overview = useOverview(year);
  const model = useMemo(() => overview.data ? new Model(overview.data) : null, [overview.data]);
  return (
    <ExecutiveView model={model} year={year} years={selectableYears()} onYear={setYear} loading={overview.isLoading}
                   error={overview.error} updatedAt={overview.dataUpdatedAt} />
  );
}
