'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function SecurityCheck({
  onToken,
  siteKey,
}: {
  onToken: (token: string) => void;
  siteKey?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null),
    callback = useRef(onToken);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!host.current || !window.turnstile) return;
    const id = window.turnstile.render(host.current, {
      sitekey: siteKey,
      theme: 'dark',
      action: 'practice',
      callback: (token: string) => {
        setFailed(false);
        callback.current(token);
      },
      'expired-callback': () => callback.current(''),
      'error-callback': () => {
        setFailed(true);
        callback.current('');
      },
    });
    return () => window.turnstile?.remove(id);
  }, [ready, siteKey]);
  if (!siteKey) return <p className="muted small">Live security checks are not configured.</p>;
  return (
    <div className="security-check">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={host} />
      {failed && (
        <p role="alert">Security check failed to load. Check your connection and reload.</p>
      )}
    </div>
  );
}
