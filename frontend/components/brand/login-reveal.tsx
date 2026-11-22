// Camada decorativa do painel de entrada (plano comercial, secao 07).
//
// Por que um componente proprio e nao o SbiSymbol: a animacao precisa de alvos separados para o bloco e para o
// ponto, e os estilos da revelacao ficam isolados no painel. A geometria e exatamente a mesma do simbolo oficial
// (components/brand/geometry.ts, a mesma de app/icon.svg): nenhuma transformacao move o ponto em relacao ao bloco,
// so a opacidade muda. O logotipo oficial do painel continua estatico, em outro elemento.
//
// E decorativo: aria-hidden, sem nome acessivel. O nome da marca ja esta no logotipo acima.
import { BLOCK_PATH, DOT, SYMBOL_SIZE } from './geometry.ts';

export { REVEAL_FLAG, REVEAL_SCRIPT, REVEAL_STEPS, REVEAL_TOTAL_MS } from './reveal.ts';

/** Marca d'agua do painel, com bloco e ponto em elementos separados para a revelacao. */
export default function LoginReveal({ size = 420 }: { size?: number }) {
  return (
    <svg
      className="login-mark"
      width={size}
      height={size}
      viewBox={`0 0 ${SYMBOL_SIZE} ${SYMBOL_SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path className="login-mark-block" d={BLOCK_PATH} fill="currentColor" />
      <circle className="login-mark-dot" cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill="currentColor" />
    </svg>
  );
}
