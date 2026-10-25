'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import type { UserSession } from '../lib/api/auth.ts';
import { avatarClass } from '../lib/areas.ts';
import { initials } from '../lib/format.ts';
import { userAvatar } from '../lib/user-avatars.ts';
import { avatarReactions, IDLE_REACTION, type AvatarExpression } from '../lib/avatar-reactions.ts';

type AvatarUser = Pick<UserSession, 'name' | 'role'> & Partial<Pick<UserSession, 'email'>>;

const idleSnapshot = () => IDLE_REACTION;
const idleSequence: ReadonlyArray<readonly [AvatarExpression, number]> = [
  ['idle', 1100], ['happy', 1400], ['wink', 380], ['idle', 1000], ['happy', 1300], ['focused', 750],
];

/** Expressoes faciais pre-renderizadas; somente a propria conta reage as operacoes da plataforma. */
export default function UserAvatar({ user, reactToActivity = false }: { user: AvatarUser; reactToActivity?: boolean }) {
  const src = userAvatar(user);
  const atlas = src?.replace('/avatares/', '/avatares/expressoes/') ?? null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [failedAtlas, setFailedAtlas] = useState<string | null>(null);
  const [readyAtlas, setReadyAtlas] = useState<string | null>(null);
  const [ambient, setAmbient] = useState<AvatarExpression>('idle');
  const [localExpression, setLocalExpression] = useState<AvatarExpression | null>(null);
  const [localPulse, setLocalPulse] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const button = useRef<HTMLButtonElement>(null);
  const originalImage = useRef<HTMLImageElement>(null);
  const expressionImage = useRef<HTMLImageElement>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapshot = useSyncExternalStore(avatarReactions.subscribe, avatarReactions.getSnapshot, idleSnapshot);
  const reaction = reactToActivity ? snapshot : IDLE_REACTION;
  const paused = snapshot.paused;
  const pulse = reactToActivity ? snapshot.pulse : localPulse;
  const expression = paused ? 'idle' : reaction.expression !== 'idle' ? reaction.expression
    : localExpression ?? (reduced ? 'idle' : ambient);
  const showExpression = expression !== 'idle' && atlas === readyAtlas && atlas !== failedAtlas && src !== failedSrc;
  const action = `Interagir com o avatar de ${user.name}`;

  useEffect(() => {
    // Imagens do shell podem terminar de carregar antes da hidratacao; onLoad nao basta nesse caso.
    if (src && originalImage.current?.complete && originalImage.current.naturalWidth === 0) setFailedSrc(src);
    if (atlas && expressionImage.current?.complete) {
      if (expressionImage.current.naturalWidth > 0) setReadyAtlas(atlas);
      else setFailedAtlas(atlas);
    }
  }, [src, atlas]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    let intersecting = true;
    const visibility = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(entries => { intersecting = entries[0]?.isIntersecting ?? false; visibility(); });
    if (button.current) observer.observe(button.current);
    motion(); visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (reactToActivity) avatarReactions.reset();
    return () => { if (reactToActivity) avatarReactions.reset(); };
  }, [reactToActivity, user.email, user.name]);

  useEffect(() => {
    if (paused || reduced || !visible) return;
    let index = user.name.length % idleSequence.length;
    let next: ReturnType<typeof setTimeout>;
    const animate = () => {
      const [frame, duration] = idleSequence[index]!;
      setAmbient(frame);
      index = (index + 1) % idleSequence.length;
      next = setTimeout(animate, duration);
    };
    next = setTimeout(animate, 400 + user.name.length % 5 * 100);
    return () => clearTimeout(next);
  }, [paused, reduced, visible, user.name]);

  useEffect(() => () => clearTimeout(localTimer.current), []);

  function greet(clicked = false) {
    if (paused) return;
    clearTimeout(localTimer.current);
    setLocalExpression(clicked && localPulse % 3 === 2 ? 'surprised' : 'wink');
    if (clicked) setLocalPulse(value => value + 1);
    localTimer.current = setTimeout(() => setLocalExpression(null), clicked ? 850 : 500);
  }

  function tilt(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || paused || reduced) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    event.currentTarget.style.setProperty('--avatar-rotate-x', `${-y * 10}deg`);
    event.currentTarget.style.setProperty('--avatar-rotate-y', `${x * 10}deg`);
  }

  function resetTilt(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty('--avatar-rotate-x');
    event.currentTarget.style.removeProperty('--avatar-rotate-y');
  }

  return (
    <button ref={button} type="button" className="avatar-control" data-paused={paused} data-expression={showExpression ? expression : 'idle'}
            data-visible={visible} data-pulse={pulse}
            data-activity={reactToActivity} aria-label={action} title={reaction.reason ? `${action} · ${reaction.reason}` : action}
            aria-disabled={paused} onClick={() => { if (!reactToActivity) greet(true); }}
            onPointerEnter={event => { if (event.pointerType === 'mouse') greet(); }} onFocus={() => greet()}
            onPointerMove={tilt} onPointerLeave={resetTilt} onPointerCancel={resetTilt}>
      <span className={`avatar ${avatarClass(user.role)}`} aria-hidden="true"
            data-expression={expression}>
        <span className="avatar-feedback" data-beat={pulse ? pulse % 2 : undefined}><span className="avatar-face">
        {initials(user.name)}
        {src && src !== failedSrc && (
          <img ref={originalImage} className="avatar-original" key={src} src={src} alt="" width={192} height={192} decoding="async" onError={() => setFailedSrc(src)} />
        )}
        {atlas && atlas !== failedAtlas && src !== failedSrc && <span className="avatar-expression" data-visible={showExpression}>
          <img ref={expressionImage} key={atlas} src={atlas} alt="" width={384} height={384} decoding="async"
               onLoad={() => setReadyAtlas(atlas)} onError={() => setFailedAtlas(atlas)} />
        </span>}
        </span></span>
      </span>
    </button>
  );
}
