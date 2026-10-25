// Simbolo e logotipo do SBI (identidade v2.0). Nome acessivel unico: "SBI — Super Business Intelligence".
import { BLOCK_PATH, BRAND_ACCESSIBLE_NAME, BRAND_DESCRIPTOR, DOT, HORIZONTAL, SYMBOL_SIZE, toneColors, VERTICAL, WORDMARK_PATHS, type LogoTone } from './geometry.ts';

function Encaixe({ tone }: { tone: LogoTone }) {
  const c = toneColors(tone);
  return <><path d={BLOCK_PATH} fill={c.block} /><circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={c.dot} /></>;
}

interface SymbolProps { size?: number; tone?: LogoTone; decorative?: boolean }

/** Simbolo isolado. Decorativo quando acompanha o nome por extenso; senao, imagem com o nome acessivel. */
export function SbiSymbol({ size = 36, tone = 'principal', decorative = false }: SymbolProps) {
  const a11y = decorative ? { 'aria-hidden': true as const, focusable: false as const } : { role: 'img' as const, 'aria-label': BRAND_ACCESSIBLE_NAME };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${SYMBOL_SIZE} ${SYMBOL_SIZE}`} xmlns="http://www.w3.org/2000/svg" className="sbi-symbol" {...a11y}>
      <Encaixe tone={tone} />
    </svg>
  );
}

type Layout = 'horizontal' | 'descritor' | 'vertical';

/** Logotipo horizontal (versao principal), assinatura com descritor ou vertical; size e a altura do simbolo em px. */
export function SbiLogo({ layout = 'horizontal', tone = 'principal', size = 36 }: { layout?: Layout; tone?: LogoTone; size?: number }) {
  const c = toneColors(tone);
  const box = layout === 'vertical' ? VERTICAL : HORIZONTAL;
  const scale = size / SYMBOL_SIZE;
  const words = BRAND_DESCRIPTOR.split(' ');
  return (
    <span className={`sbi-logo sbi-logo-${layout}`} role="img" aria-label={BRAND_ACCESSIBLE_NAME}>
      <svg className="sbi-logo-mark" width={Math.round(box.width * scale)} height={Math.round(box.height * scale)} viewBox={`0 0 ${box.width} ${box.height}`}
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <Encaixe tone={tone} />
        <g fill={c.text} transform={layout === 'vertical' ? VERTICAL.wordmark : undefined}>
          {WORDMARK_PATHS.map(d => <path key={d.slice(0, 16)} d={d} />)}
        </g>
      </svg>
      {layout === 'descritor' && (
        <span className="sbi-logo-descriptor" aria-hidden="true" style={{ color: c.descriptor, fontSize: Math.round(size * 0.3) }}>
          <span>{words.slice(0, -1).join(' ')}</span><span>{words.at(-1)}</span>
        </span>
      )}
    </span>
  );
}
