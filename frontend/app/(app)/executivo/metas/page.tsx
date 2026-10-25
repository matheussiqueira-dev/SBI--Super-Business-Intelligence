import type { Metadata } from 'next';
import { sessionFor } from '../../../../lib/server/session.ts';
import { NoAccess } from '../../../../components/feedback.tsx';
import GoalsPlanner from './goals-planner.tsx';

export const metadata: Metadata = { title: 'Metas' };

export default async function MetasPage() {
  const { allowed } = await sessionFor('METAS', '/executivo/metas');
  return allowed ? <GoalsPlanner /> : <NoAccess />;
}
