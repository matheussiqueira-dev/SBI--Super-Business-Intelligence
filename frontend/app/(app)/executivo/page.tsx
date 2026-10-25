import type { Metadata } from 'next';
import { sessionFor } from '../../../lib/server/session.ts';
import { NoAccess } from '../../../components/feedback.tsx';
import ExecutiveDashboard from './executive-dashboard.tsx';

export const metadata: Metadata = { title: 'Painel executivo' };

export default async function ExecutivoPage() {
  const { allowed } = await sessionFor('EXECUTIVO', '/executivo');
  return allowed ? <ExecutiveDashboard /> : <NoAccess />;
}
