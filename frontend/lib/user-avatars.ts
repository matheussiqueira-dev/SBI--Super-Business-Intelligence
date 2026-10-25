import type { UserSession } from './api/auth.ts';

type AvatarUser = Pick<UserSession, 'name'> & Partial<Pick<UserSession, 'email'>>;

/** Nomes completos solicitados; aliases/e-mails apenas das contas existentes no seed demo. */
export const USER_AVATARS = [
  { number: 21, name: 'Matheus Henrique Dias Siqueira', aliases: ['Matheus Siqueira'], email: 'matheussiqueira@sbi.tech' },
  { number: 26, name: 'Gabriel Sousa Vasconcelos', aliases: ['Gabriel Sousa'], email: 'gabrielsousa@sbi.tech' },
  { number: 9, name: 'Francisco Miguel De Lemos Sena Ferreira', aliases: ['Francisco Ferreira'], email: 'franciscoferreira@sbi.tech' },
  { number: 12, name: 'Allan Gabriel Almeida Barros', aliases: ['Allan Barros'], email: 'allanbarros@sbi.tech' },
  { number: 19, name: 'Bruno Marciano De Amorim Josino', aliases: [], email: null },
  { number: 18, name: 'Paulo Thiago Gomes Da Silva', aliases: [], email: null },
  { number: 13, name: 'Christian Felix Gbedande Azonyetin', aliases: [], email: null },
] as const;

function normalizedName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Correspondencia exata, nunca por primeiro nome ou substring; usuarios novos mantem as iniciais. */
export function userAvatar(user: AvatarUser): string | null {
  const email = user.email?.trim().toLowerCase();
  const name = normalizedName(user.name);
  const avatar = USER_AVATARS.find(entry => entry.email !== null && entry.email === email)
    ?? USER_AVATARS.find(entry => [entry.name, ...entry.aliases].some(alias => normalizedName(alias) === name));
  return avatar ? `/avatares/avatar-${avatar.number}.webp` : null;
}
