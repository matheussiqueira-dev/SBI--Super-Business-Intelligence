import type { Metadata } from 'next';
import { DemoProvider } from '../../lib/demo/store.tsx';
import { DEMO_NOTICE, STORE } from '../../lib/demo/scenario.ts';
import DemoApp from './demo-app.tsx';

export const metadata: Metadata = {
  title: 'Demonstração',
  description: `${DEMO_NOTICE}. Explore o SBI nos três níveis de gestão de ${STORE.name}, sem cadastro e sem login.`,
};

/**
 * Rota publica da demonstracao (secao 9 do plano de evolucao). Nao exige sessao: o proxy do Next libera /demo e a
 * pagina nao chama /auth/me nem a API. A base sintetica e montada no navegador a partir da semente, entao nenhuma
 * informacao real e lida. O dia da loja vem do servidor para o cliente e o servidor concordarem na primeira pintura;
 * por isso a pagina e sempre renderizada na hora, nunca no build.
 */
export const dynamic = 'force-dynamic';

function storeToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default function DemoPage() {
  return (
    <DemoProvider today={storeToday()}>
      <DemoApp />
    </DemoProvider>
  );
}
