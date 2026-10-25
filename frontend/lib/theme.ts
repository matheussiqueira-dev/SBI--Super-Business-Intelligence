// Tema da interface (manual v2.0, secao 30): segue o sistema e pode ser fixado por <html data-theme>. A escolha fica no
// navegador (localStorage), nunca na conta: e preferencia de leitura, nao dado da loja.
export type ThemeChoice = 'sistema' | 'claro' | 'escuro';

export const THEME_KEY = 'sbi:tema';
export const THEME_CHOICES: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'sistema', label: 'Tema do sistema' },
  { value: 'claro', label: 'Tema claro' },
  { value: 'escuro', label: 'Tema escuro' },
];

/** Valor guardado -> escolha valida; qualquer outra coisa volta para o tema do sistema. */
export function parseTheme(value: string | null | undefined): ThemeChoice {
  return value === 'claro' || value === 'escuro' ? value : 'sistema';
}

/** Atributo data-theme do <html> para a escolha (sem atributo, os tokens seguem prefers-color-scheme). */
export function themeAttribute(choice: ThemeChoice): 'light' | 'dark' | null {
  return choice === 'claro' ? 'light' : choice === 'escuro' ? 'dark' : null;
}

/** Roda no <head> antes da pintura, para a tela nao piscar no tema errado; sem armazenamento, fica o do sistema. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='claro')document.documentElement.dataset.theme='light';else if(t==='escuro')document.documentElement.dataset.theme='dark'}catch(e){}`;

export function applyTheme(choice: ThemeChoice, root: HTMLElement, storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined): void {
  const attribute = themeAttribute(choice);
  if (attribute) root.dataset.theme = attribute;
  else delete root.dataset.theme;
  try {
    if (choice === 'sistema') storage?.removeItem(THEME_KEY);
    else storage?.setItem(THEME_KEY, choice);
  } catch {
    // Armazenamento bloqueado: o tema vale so ate fechar a pagina.
  }
}
