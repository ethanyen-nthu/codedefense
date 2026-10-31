'use client';
import { useSyncExternalStore } from 'react';
export type Theme = 'light' | 'dark' | 'system';
const QUERY = '(prefers-color-scheme: dark)';
let fallbackPreference: Theme | undefined;
function apply() {
  let preference: Theme = 'system';
  try {
    const p = localStorage.getItem('codeta-theme');
    if (p === 'light' || p === 'dark') preference = p;
  } catch {}
  if (fallbackPreference) preference = fallbackPreference;
  document.documentElement.dataset.preference = preference;
  document.documentElement.dataset.theme =
    preference === 'system' ? (matchMedia(QUERY).matches ? 'dark' : 'light') : preference;
}
function subscribe(listener: () => void) {
  const media = matchMedia(QUERY);
  const update = () => {
    apply();
    listener();
  };
  media.addEventListener('change', update);
  window.addEventListener('storage', update);
  window.addEventListener('codeta-theme', update);
  return () => {
    media.removeEventListener('change', update);
    window.removeEventListener('storage', update);
    window.removeEventListener('codeta-theme', update);
  };
}
const snapshot = () =>
  `${document.documentElement.dataset.preference || 'system'}:${document.documentElement.dataset.theme || 'light'}`;
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'system:light');
  const [preference, resolved] = value.split(':') as [Theme, 'light' | 'dark'];
  return {
    preference,
    resolved,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem('codeta-theme', theme);
        fallbackPreference = undefined;
      } catch {
        fallbackPreference = theme;
      }
      document.documentElement.dataset.preference = theme;
      document.documentElement.dataset.theme =
        theme === 'system' ? (matchMedia(QUERY).matches ? 'dark' : 'light') : theme;
      window.dispatchEvent(new Event('codeta-theme'));
    },
  };
}
export function ThemeSelector() {
  const { preference, setTheme } = useTheme();
  return (
    <label className="theme-control">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={preference}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
