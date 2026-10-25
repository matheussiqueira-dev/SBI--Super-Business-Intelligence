'use client';
import { useEffect, useState } from 'react';
import { applyTheme, parseTheme, THEME_CHOICES, THEME_KEY, type ThemeChoice } from '../lib/theme.ts';
import { Icon, type IconName } from './brand/icons.tsx';

const ICONS: Readonly<Record<ThemeChoice, IconName>> = { sistema: 'monitor', claro: 'sol', escuro: 'lua' };

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Seletor de tema (sistema, claro, escuro): fixa data-theme no <html> e guarda a escolha neste navegador. */
export default function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>('sistema');
  useEffect(() => {
    try {
      setChoice(parseTheme(storage()?.getItem(THEME_KEY)));
    } catch {
      setChoice('sistema');
    }
  }, []);
  function choose(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next, document.documentElement, storage());
  }
  return (
    <fieldset className="theme-switch">
      <legend className="sr-only">Tema da interface</legend>
      {THEME_CHOICES.map(option => (
        <label key={option.value} title={option.label}>
          <input type="radio" name="tema" value={option.value} checked={choice === option.value} onChange={() => choose(option.value)} />
          <Icon name={ICONS[option.value]} size={18} />
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
