const backend = new URL(process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8080');
if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/') {
  throw new Error('BACKEND_ORIGIN must be an HTTP(S) origin without credentials or path.');
}

// Cabecalhos das paginas. A CSP limita enquadramento, base, formularios e plugins sem restringir scripts e
// estilos, que o App Router injeta em linha; as respostas da API ja trazem os proprios cabecalhos.
export const PAGE_SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

export default {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path((?!api/backend/).*)', headers: PAGE_SECURITY_HEADERS }];
  },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${backend.origin}/:path*` }];
  },
};
