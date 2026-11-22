// Script da revelacao do painel de entrada (plano comercial, secao 07). Fica em .ts, ao lado de geometry.ts, para
// o teste unitario (node --test) exercitar o script sem JSX.
//
//   sem atributo  -> estado visual final (JavaScript desligado, bloqueado ou com falha)
//   "on"          -> primeira visita da aba: a revelacao roda uma vez
//   "off"         -> a aba ja viu: entra direto no estado final, inclusive depois de um erro de login
//
// Vai inline antes do painel no HTML: o atributo existe antes de o painel ser pintado, sem piscar. Qualquer falha
// de sessionStorage (aba privada, armazenamento bloqueado) cai no catch e deixa a tela no estado final.

export const REVEAL_FLAG = 'sbi.login.reveal';

export const REVEAL_SCRIPT = `try{var d=document.documentElement;` +
  `if(sessionStorage.getItem('${REVEAL_FLAG}')){d.dataset.sbiReveal='off'}` +
  `else{sessionStorage.setItem('${REVEAL_FLAG}','1');d.dataset.sbiReveal='on'}}catch(e){}`;

/** Duracao total da sequencia, em ms. O plano pede composicao estavel em 600 ms. */
export const REVEAL_TOTAL_MS = 600;

/** Etapas da sequencia, do plano comercial (secao 07). O CSS em globals.css usa estes mesmos numeros. */
export const REVEAL_STEPS = [
  { part: 'bloco', delayMs: 0, durationMs: 180 },
  { part: 'ponto', delayMs: 150, durationMs: 210 },
  { part: 'texto', delayMs: 300, durationMs: 220 },
] as const;
