'use client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api/http.ts';
import { avatarReactions, type AvatarAction } from '../lib/avatar-reactions.ts';

function actionOf(meta: Record<string, unknown> | undefined): AvatarAction {
  const action = meta?.avatarAction;
  return action === 'sale-created' || action === 'payment-confirmed' || action === 'order-canceled' ? action : 'saved';
}

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reactToClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.shell') && !target.closest('[data-avatar-pause]')) avatarReactions.interact();
    };
    // Captura reconhece tambem cliques de teclado e handlers que interrompem propagacao.
    document.addEventListener('click', reactToClick, true);
    return () => document.removeEventListener('click', reactToClick, true);
  }, []);
  const [client] = useState(() => {
    const tokens = new WeakMap<object, symbol>();
    return new QueryClient({
      mutationCache: new MutationCache({
        onMutate: (_variables, mutation) => { tokens.set(mutation, avatarReactions.begin()); },
        onSuccess: (_data, _variables, _context, mutation) => {
          const token = tokens.get(mutation);
          if (token) avatarReactions.finish(token, actionOf(mutation.meta));
          tokens.delete(mutation);
        },
        onError: (error, _variables, _context, mutation) => {
          const token = tokens.get(mutation);
          if (token) avatarReactions.finish(token, actionOf(mutation.meta), error);
          tokens.delete(mutation);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 10_000,
          refetchOnWindowFocus: false,
          // Erro do cliente (4xx) nao melhora com nova tentativa; rede e 5xx tentam mais uma vez.
          retry: (failures, error) => failures < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
        },
        mutations: { retry: false },
      },
    });
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
