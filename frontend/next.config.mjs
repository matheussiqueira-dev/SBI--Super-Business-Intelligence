import { fileURLToPath } from 'node:url';
const backend = new URL(process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8080');
if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/') {
  throw new Error('BACKEND_ORIGIN must be an HTTP(S) origin without credentials or path.');
}
export default {
  poweredByHeader: false,
  // A raiz do repositorio tambem tem package-lock.json (scripts do contrato): a raiz do Next e esta pasta.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${backend.origin}/:path*` }];
  },
};
