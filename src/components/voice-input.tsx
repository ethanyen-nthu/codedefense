'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic, Square } from 'lucide-react';
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const subscribe = () => () => {};
const speechSupported = () => {
  const win = window as SpeechWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
};
const serverSupported = () => false;
export function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const supported = useSyncExternalStore(subscribe, speechSupported, serverSupported);
  const [recording, setRecording] = useState(false),
    [language, setLanguage] = useState('en-US'),
    [error, setError] = useState('');
  const active = useRef<Recognition | null>(null);
  useEffect(() => {
    return () => {
      if (active.current) {
        active.current.onend = null;
        active.current.onerror = null;
        active.current.onresult = null;
        active.current.abort();
      }
    };
  }, []);
  function toggle() {
    if (recording) {
      active.current?.stop();
      return;
    }
    const win = window as SpeechWindow,
      Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    active.current = recognition;
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    setError('');
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ');
      if (text.trim()) onTranscript(text.trim());
    };
    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. You can keep typing.'
          : event.error === 'no-speech'
            ? 'No speech was detected. Try again or type your answer.'
            : 'Dictation could not connect. Typed answers are always available.',
      );
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    try {
      recognition.start();
      setRecording(true);
    } catch {
      setError('Dictation is unavailable right now. Type your answer instead.');
      setRecording(false);
    }
  }
  if (!supported)
    return (
      <p className="small muted voice-fallback">
        Dictation unavailable in this browser. Typed input is ready.
      </p>
    );
  return (
    <div className="voice-input">
      <div className="row">
        <button className="btn ghost" disabled={disabled} onClick={toggle}>
          {recording ? <Square size={14} /> : <Mic size={14} />}{' '}
          {recording ? 'Stop dictation' : 'Dictate answer'}
        </button>
        <label className="sr-only" htmlFor="dictation-language">
          Dictation language
        </label>
        <select
          id="dictation-language"
          aria-label="Dictation language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={recording}
        >
          <option value="en-US">English</option>
          <option value="zh-TW">繁體中文</option>
        </select>
      </div>
      <p className="small muted">
        Optional browser speech service; audio may be processed by your browser’s provider. Review
        the transcript before submitting. Nothing is sent to the TA automatically.
      </p>
      {error && (
        <p className="small warning-text" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
