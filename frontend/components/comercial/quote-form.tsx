'use client';
// Formulario de cotacao (plano comercial, secao 06).
//
// O que o plano cobra e o que esta implementado aqui:
//   - nome, empresa, e-mail e cidade/UF obrigatorios; segmento, WhatsApp e mensagem opcionais;
//   - rotulo visivel em todo campo, erro por campo ligado ao input por aria-describedby e resumo em role="alert";
//   - confirmacao com o protocolo em role="status", lida pelo leitor de tela sem mover o foco da pessoa;
//   - falha preserva o que foi digitado e permite repetir o envio (o estado dos campos nunca e limpo no erro);
//   - aviso de uso dos dados com link para o Aviso de Privacidade;
//   - campo armadilha escondido e tempo de preenchimento, conferidos no servidor.
//
// O envio e um fetch para /api/cotacao, de mesma origem. O <form> tem action e method nativos: se o JavaScript
// nao carregar, o navegador envia o formulario para a mesma rota, que aceita corpo de formulario.
import { useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { QUOTE, ROUTES } from '../../lib/comercial/copy.ts';
import { QuoteFormInput, quoteFieldErrors, UF, type QuoteFieldErrors } from '../../lib/leads/lead.ts';

const NETWORK = 'Não conseguimos falar com o servidor. Seus dados continuam no formulário: tente enviar novamente.';

interface Sent { protocol: string; message: string }

export interface QuoteFormProps {
  /** false quando nao ha onde gravar: o formulario sai do ar e o canal real aparece no lugar. */
  readonly available: boolean;
  readonly salesEmail: string | null;
  readonly supportUrl: string | null;
}

export default function QuoteForm({ available, salesEmail, supportUrl }: QuoteFormProps) {
  const id = useId();
  const openedAt = useRef(Date.now());
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  const field = (name: string) => `${id}-${name}`;
  const errorId = (name: string) => `${id}-${name}-erro`;
  const describe = (name: keyof QuoteFieldErrors, hint?: string) =>
    [errors[name] ? errorId(name) : null, hint ?? null].filter(Boolean).join(' ') || undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;

    // Mesma validacao do servidor, para marcar o campo antes de gastar uma requisicao.
    const parsed = QuoteFormInput.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = quoteFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setSummary(QUOTE_ERROR_SUMMARY(Object.keys(fieldErrors).length));
      return;
    }

    setBusy(true);
    setSummary('');
    try {
      const response = await fetch('/api/cotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values, elapsedMs: Date.now() - openedAt.current }),
      });
      const body = (await response.json().catch(() => null)) as
        { protocolo?: string; mensagem?: string; campos?: QuoteFieldErrors } | null;
      if (response.ok && body?.protocolo && body.mensagem) {
        setErrors({});
        setSent({ protocol: body.protocolo, message: body.mensagem });
        return;
      }
      setErrors(body?.campos ?? {});
      setSummary(body?.mensagem ?? NETWORK);
    } catch {
      setSummary(NETWORK);
    } finally {
      setBusy(false);
    }
  }

  if (!available) {
    return (
      <div className="c-quote-off">
        <h3>{QUOTE.unavailableTitle}</h3>
        <p>Estamos preparando a captação pelo site. Fale com a equipe comercial por estes canais:</p>
        <ul className="c-links">
          {salesEmail
            ? <li><a href={`mailto:${salesEmail}`}>{salesEmail}</a></li>
            : <li><span className="c-muted">Canal comercial a configurar pela equipe.</span></li>}
          {supportUrl && <li><a href={supportUrl} rel="noreferrer">Central de suporte</a></li>}
          <li><Link href={ROUTES.demo}>Explorar a demonstração</Link></li>
        </ul>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="c-quote-done" role="status">
        <p className="c-quote-done-title">{sent.message}</p>
        <p>Anote o protocolo <strong>{sent.protocol}</strong>. A confirmação automática e a primeira resposta da equipe são avisos diferentes: o retorno humano traz os próximos passos e, quando necessário, um diagnóstico antes de fechar valores e prazo.</p>
        <p><Link className="btn" href={ROUTES.demo}>Enquanto isso, explore a demonstração</Link></p>
      </div>
    );
  }

  return (
    <form className="c-quote-form" onSubmit={submit} aria-busy={busy} noValidate>
      {/* Sem JavaScript nao ha envio: o caminho nativo do formulario nao consegue devolver erro por campo
          preservando o que foi digitado, e entregar meio caminho seria pior do que dizer o que fazer. O resto
          da pagina (conteudo, navegacao e FAQ) continua funcionando sem script. */}
      <noscript>
        <p className="notice notice-warn">
          O envio pela página precisa de JavaScript.{' '}
          {salesEmail ? <>Fale com a equipe comercial por <a href={`mailto:${salesEmail}`}>{salesEmail}</a>.</>
            : <>Ative o JavaScript para enviar sua solicitação.</>}
        </p>
      </noscript>
      {summary && <p className="notice notice-error" role="alert">{summary}</p>}

      <div className="c-quote-grid">
        <div className="field">
          <label htmlFor={field('name')}>Nome<span className="c-req" aria-hidden="true"> *</span></label>
          <input className="input input-lg" id={field('name')} name="name" type="text" autoComplete="name" required maxLength={120}
                 aria-invalid={errors.name ? true : undefined} aria-describedby={describe('name')} disabled={busy} />
          {errors.name && <p className="field-error" id={errorId('name')}>{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor={field('company')}>Loja ou empresa<span className="c-req" aria-hidden="true"> *</span></label>
          <input className="input input-lg" id={field('company')} name="company" type="text" autoComplete="organization" required maxLength={140}
                 aria-invalid={errors.company ? true : undefined} aria-describedby={describe('company')} disabled={busy} />
          {errors.company && <p className="field-error" id={errorId('company')}>{errors.company}</p>}
        </div>

        <div className="field">
          <label htmlFor={field('email')}>E-mail<span className="c-req" aria-hidden="true"> *</span></label>
          <input className="input input-lg" id={field('email')} name="email" type="email" autoComplete="email" required maxLength={254}
                 spellCheck={false} aria-invalid={errors.email ? true : undefined} aria-describedby={describe('email')} disabled={busy} />
          {errors.email && <p className="field-error" id={errorId('email')}>{errors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor={field('cityUf')}>Cidade/UF<span className="c-req" aria-hidden="true"> *</span></label>
          <input className="input input-lg" id={field('cityUf')} name="cityUf" type="text" required maxLength={120}
                 placeholder="Fortaleza/CE" list={field('uf-list')}
                 aria-invalid={errors.cityUf ? true : undefined} aria-describedby={describe('cityUf', field('cityUf-dica'))} disabled={busy} />
          <p className="hint" id={field('cityUf-dica')}>Cidade e sigla do estado separadas por barra.</p>
          {errors.cityUf && <p className="field-error" id={errorId('cityUf')}>{errors.cityUf}</p>}
        </div>

        <div className="field">
          <label htmlFor={field('segment')}>Segmento <span className="c-opt">(opcional)</span></label>
          <input className="input input-lg" id={field('segment')} name="segment" type="text" maxLength={80}
                 placeholder="Eletrônicos e acessórios"
                 aria-invalid={errors.segment ? true : undefined} aria-describedby={describe('segment')} disabled={busy} />
          {errors.segment && <p className="field-error" id={errorId('segment')}>{errors.segment}</p>}
        </div>

        <div className="field">
          <label htmlFor={field('whatsapp')}>WhatsApp <span className="c-opt">(opcional)</span></label>
          <input className="input input-lg" id={field('whatsapp')} name="whatsapp" type="tel" autoComplete="tel-national" maxLength={40}
                 placeholder="(85) 99999-0000" inputMode="tel"
                 aria-invalid={errors.whatsapp ? true : undefined} aria-describedby={describe('whatsapp')} disabled={busy} />
          {errors.whatsapp && <p className="field-error" id={errorId('whatsapp')}>{errors.whatsapp}</p>}
        </div>
      </div>

      <div className="field">
        <label htmlFor={field('message')}>Mensagem <span className="c-opt">(opcional)</span></label>
        <textarea className="textarea" id={field('message')} name="message" rows={4} maxLength={1000}
                  placeholder="Conte quantos itens tem o catálogo, quantas pessoas vendem e o que precisa resolver primeiro."
                  aria-invalid={errors.message ? true : undefined} aria-describedby={describe('message')} disabled={busy} />
        {errors.message && <p className="field-error" id={errorId('message')}>{errors.message}</p>}
      </div>

      {/* Armadilha: fora da ordem de tabulacao e escondida do leitor de tela. Preenchida, o servidor descarta. */}
      <div className="c-trap" aria-hidden="true">
        <label htmlFor={field('site')}>Site</label>
        <input id={field('site')} name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <datalist id={field('uf-list')}>
        {UF.map(uf => <option key={uf} value={`/${uf}`} />)}
      </datalist>

      <p className="c-consent">
        {QUOTE.consent} <Link href={ROUTES.privacy}>Aviso de Privacidade</Link>.
      </p>

      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? 'Enviando…' : QUOTE.submit}
      </button>
    </form>
  );
}

/** Resumo acima do formulario: diz quantos campos faltam, sem repetir cada mensagem. */
export function QUOTE_ERROR_SUMMARY(count: number): string {
  return count === 1 ? 'Confira o campo destacado e envie novamente.' : `Confira os ${count} campos destacados e envie novamente.`;
}
