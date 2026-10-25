'use client';
import { useSyncExternalStore } from 'react';
import { avatarReactions, IDLE_REACTION } from '../lib/avatar-reactions.ts';

const serverSnapshot = () => IDLE_REACTION;

/** Controle separado: clicar no rosto interage; pausar continua disponivel pelo teclado e toque. */
export default function AvatarMotionToggle() {
  const { paused } = useSyncExternalStore(avatarReactions.subscribe, avatarReactions.getSnapshot, serverSnapshot);
  return <button type="button" className="btn btn-ghost" data-avatar-pause aria-pressed={paused}
                 onClick={() => avatarReactions.togglePaused()}>
    {paused ? 'Retomar avatares' : 'Pausar avatares'}
  </button>;
}
