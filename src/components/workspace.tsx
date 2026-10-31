'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Braces,
  History,
  ShieldCheck,
  Upload,
  FileCode2,
  Trash2,
  ChevronRight,
  Sparkles,
  Lightbulb,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Download,
  Menu,
  X,
  Clock,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { Home } from './home';
import { VoiceInput } from './voice-input';
import { SecurityCheck } from './security-check';
import { PracticeReport } from './practice-report';
import {
  configSchema,
  emptyContext,
  type ApiInput,
  type AssignmentContext,
  type InterviewConfig,
  type PracticeSession,
} from '@/lib/schemas';
import { createDemo, demoAction, DEMOS, retryDemo, startDemo } from '@/lib/demo';
import { deleteHistory, downloadJson, DRAFT_KEY, loadHistory, saveHistory } from '@/lib/storage';
import { readSourceFile, validateSource } from '@/lib/source';
import { summarize } from '@/lib/scoring';
const CodeEditor = dynamic(() => import('./code-editor').then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <LoaderCircle className="spin" />
      Loading editor…
    </div>
  ),
});
type View = 'home' | 'editor' | 'analysis' | 'interview' | 'report' | 'history' | 'privacy' | 'how';
const ACTIVE = 'codedefense-active-v1';
function viewFor(s: PracticeSession): View {
  return s.stage === 'analysis' ? 'analysis' : s.stage === 'complete' ? 'report' : 'interview';
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please retry.';
}

export function Workspace() {
  const [view, setView] = useState<View>('home'),
    [code, setCode] = useState(''),
    [context, setContext] = useState<AssignmentContext>(emptyContext),
    [config, setConfig] = useState<InterviewConfig>(configSchema.parse({}));
  const [session, setSession] = useState<PracticeSession | null>(null),
    [history, setHistory] = useState<PracticeSession[]>([]),
    [answer, setAnswer] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const [status, setStatus] = useState<{
      live: boolean;
      maxCode: number;
      siteKey?: string | null;
    } | null>(null),
    [token, setToken] = useState(''),
    [challengeKey, setChallengeKey] = useState(0),
    [consent, setConsent] = useState(false),
    [mobileCode, setMobileCode] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [storageWarning, setStorageWarning] = useState('');
  const upload = useRef<HTMLInputElement>(null),
    main = useRef<HTMLElement>(null),
    pending = useRef(false);
  async function api(input: ApiInput): Promise<PracticeSession> {
    const response = await fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(110000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request failed. Please retry.');
    return data as PracticeSession;
  }
  useEffect(() => {
    const list = loadHistory();
    setHistory(list);
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (typeof draft?.code === 'string') setCode(draft.code);
      if (draft?.context) setContext({ ...emptyContext, ...draft.context });
      const active = list.find((s) => s.id === localStorage.getItem(ACTIVE));
      if (active) {
        setSession(active);
        setCode(active.code);
        setContext(active.context);
        setView(viewFor(active));
        if (!active.demo)
          void api({ action: 'resume', id: active.id })
            .then((s) => {
              setSession(s);
              setView(viewFor(s));
            })
            .catch((e) => setError(errorMessage(e)));
      }
    } catch {
      setStorageWarning(
        'Browser storage is unavailable or damaged. Export your reports before leaving.',
      );
    }
    void fetch('/api/practice', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStatus)
      .catch(() => setStatus({ live: false, maxCode: 30000 }));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ code, context }));
      } catch {
        setStorageWarning('Your browser could not save this draft. Keep a copy of your code.');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [code, context]);
  useEffect(() => {
    if (view !== 'interview' || !session?.config.timer || session.stage !== 'question') return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [view, session?.current?.id, session?.config.timer, session?.stage]);
  useEffect(() => {
    setElapsed(0);
  }, [session?.current?.id]);
  function navigate(next: View) {
    setView(next);
    setError('');
    setNavOpen(false);
    setMobileCode(false);
    if (next === 'home' || next === 'editor' || next === 'history')
      try {
        localStorage.removeItem(ACTIVE);
      } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function persist(s: PracticeSession) {
    setSession(s);
    setView(viewFor(s));
    setAnswer('');
    setMobileCode(false);
    try {
      saveHistory(s);
      localStorage.setItem(ACTIVE, s.id);
      setHistory(loadHistory());
    } catch {
      setStorageWarning('History could not be saved. Download your practice report to keep it.');
    }
  }
  async function run(label: string, work: () => Promise<void> | void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(label);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy('');
      setToken('');
      setChallengeKey((k) => k + 1);
    }
  }
  function demo(index = 0) {
    setError('');
    setCode(DEMOS[index].code);
    setContext({ ...emptyContext, title: DEMOS[index].name });
    persist(createDemo(index));
  }
  async function analyze() {
    await run('Reading your source…', async () => {
      const valid = validateSource(code, status?.maxCode);
      if (!consent) throw new Error('Confirm the AI processing notice to continue.');
      persist(
        await api({ action: 'analyze', code: valid, context, consent: true, challenge: token }),
      );
    });
  }
  async function start() {
    if (!session) return;
    await run('Preparing your interview…', async () =>
      persist(
        session.demo
          ? startDemo(session, config)
          : await api({ action: 'start', id: session.id, config, challenge: token }),
      ),
    );
  }
  async function action(action: 'answer' | 'hint' | 'skip' | 'next') {
    if (!session) return;
    await run(
      action === 'answer' ? 'Reviewing your reasoning…' : 'Updating your practice…',
      async () => {
        if (action === 'answer' && !answer.trim()) throw new Error('Write an answer first.');
        if (session.demo) persist(demoAction(session, action, answer));
        else
          persist(
            await api(
              action === 'answer'
                ? {
                    action,
                    id: session.id,
                    questionId: session.current!.id,
                    answer,
                    followUp: session.stage === 'followup',
                    challenge: token,
                  }
                : { action, id: session.id },
            ),
          );
      },
    );
  }
  async function resume(s: PracticeSession) {
    await run('Resuming your session…', async () => {
      setCode(s.code);
      setContext(s.context);
      persist(s.demo || s.stage === 'complete' ? s : await api({ action: 'resume', id: s.id }));
    });
  }
  function editor() {
    if (session) {
      setCode(session.code);
      setContext(session.context);
    }
    navigate('editor');
  }
  function newInterview() {
    if (!session) return;
    setConfig(session.config);
    if (session.demo) {
      demo(DEMOS.findIndex((d) => d.code === session.code));
    } else {
      void run('Preparing a fresh interview…', async () =>
        persist(await api({ action: 'restart', id: session.id })),
      );
    }
  }
  async function retry() {
    if (!session) return;
    await run('Preparing another attempt…', async () =>
      persist(session.demo ? retryDemo(session) : await api({ action: 'retry', id: session.id })),
    );
  }
  async function removeHistory() {
    if (
      !window.confirm(
        'Delete all browser-local practice history and drafts? Active live session state will also be deleted where reachable.',
      )
    )
      return;
    await run('Deleting history…', async () => {
      let failures = 0;
      for (const s of history.filter((s) => !s.demo)) {
        try {
          await api({ action: 'delete', id: s.id });
        } catch {
          failures++;
        }
      }
      deleteHistory();
      localStorage.removeItem(ACTIVE);
      setHistory([]);
      setSession(null);
      setCode('');
      setContext(emptyContext);
      setView('history');
      if (failures)
        setError(
          'Local data was deleted. Some temporary server sessions could not be reached; they expire within 24 hours.',
        );
    });
  }
  const isDemo = Boolean(session?.demo),
    current = session?.current,
    last = session?.records.at(-1),
    showFeedback = session?.stage === 'feedback';
  const liveAllowed = Boolean(status?.live && token),
    needsChallenge =
      view === 'editor' || view === 'analysis' || (view === 'interview' && !showFeedback);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="CodeDefense home">
          <span className="brand-icon">
            <Braces size={23} />
          </span>
          <span>
            Code<span className="brand-light">Defense</span>
          </span>
        </button>
        <span className="nav-divider" />
        <span className="topbar-label">C++ ORAL EXAM PRACTICE</span>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={view === 'editor' ? 'active' : ''} onClick={() => navigate('editor')}>
            Practice
          </button>
          <button
            className={view === 'history' ? 'active' : ''}
            onClick={() => navigate('history')}
          >
            History
          </button>
          <button onClick={() => navigate('how')}>How it works</button>
        </nav>
        <button className="btn secondary compact top-start" onClick={() => navigate('editor')}>
          Open workspace
          <ArrowUpRight size={15} />
        </button>
        <button
          className="icon-btn mobile-menu"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <X /> : <Menu />}
        </button>
      </header>
      {navOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button onClick={() => navigate('editor')}>Practice</button>
          <button onClick={() => navigate('history')}>History</button>
          <button onClick={() => navigate('how')}>How it works</button>
          <button onClick={() => navigate('privacy')}>Privacy</button>
        </nav>
      )}
      <main id="main" ref={main} tabIndex={-1}>
        {storageWarning && <div className="notice warning global-notice">{storageWarning}</div>}
        {error && (
          <div className="error-banner global-notice" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button aria-label="Dismiss error" className="icon-btn" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {busy && (
          <div className="busy-banner" role="status">
            <LoaderCircle size={17} className="spin" />
            {busy}
          </div>
        )}
        {view === 'home' && (
          <>
            <Home
              onStart={() => navigate('editor')}
              onDemo={() => demo()}
              onHow={() => navigate('how')}
            />
            {history.length > 0 && (
              <div className="content resume-strip">
                <History size={20} />
                <span>Your last session is saved on this browser.</span>
                <button className="btn secondary" onClick={() => void resume(history[0])}>
                  Resume / Review
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {view === 'editor' && (
          <div className="content editor-page">
            <div className="breadcrumbs">
              WORKSPACE
              <ChevronRight size={12} />
              <span>YOUR SOURCE CODE</span>
            </div>
            <div className="page-heading">
              <div>
                <p className="eyebrow">01 / BRING YOUR CODE</p>
                <h1>Start with what you wrote.</h1>
                <p className="muted">Your next TA question is already hiding in your code.</p>
              </div>
              <span className="badge">
                <ShieldCheck size={13} />
                Never compiled or executed
              </span>
            </div>
            <div className="editor-grid">
              <section className="panel editor-panel">
                <div className="editor-toolbar">
                  <span>
                    <FileCode2 size={16} />
                    main.cpp
                  </span>
                  <div className="row">
                    <button className="toolbar-button" onClick={() => upload.current?.click()}>
                      <Upload size={14} />
                      Upload
                    </button>
                    <button
                      className="toolbar-button"
                      onClick={() => {
                        setCode(DEMOS[0].code);
                        setContext({ ...emptyContext, title: DEMOS[0].name });
                      }}
                    >
                      Example
                    </button>
                    <button
                      className="icon-btn"
                      title="Clear code"
                      aria-label="Clear code"
                      onClick={() => {
                        if (
                          !code ||
                          window.confirm('Clear the editor? This replaces your current draft.')
                        )
                          setCode('');
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <input
                  ref={upload}
                  aria-label="Upload C++ source file"
                  type="file"
                  accept=".cpp,.txt"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void run('Reading source file…', async () =>
                        setCode(await readSourceFile(file, status?.maxCode)),
                      );
                    e.target.value = '';
                  }}
                />
                {!code && (
                  <div className="editor-placeholder">
                    Paste your C++ program below, or upload a .cpp file.
                  </div>
                )}
                <CodeEditor value={code} onChange={setCode} />
                <div className="editor-status">
                  <span>C++ · UTF-8 · text only</span>
                  <span className={code.length > (status?.maxCode || 30000) ? 'danger-text' : ''}>
                    {code.length.toLocaleString()} / {(status?.maxCode || 30000).toLocaleString()}{' '}
                    characters
                  </span>
                </div>
                <p className="small muted editor-caption">
                  .cpp / .txt · 120 KB maximum · 1,500 lines · Tab moves focus for keyboard
                  navigation
                </p>
              </section>
              <aside className="context-panel">
                <div className="panel">
                  <p className="eyebrow">MAKE IT YOUR LAB</p>
                  <h2>A little context helps.</h2>
                  <p className="muted small">
                    Optional. Leave these blank and we’ll work from your source.
                  </p>
                  <label>
                    C++ standard
                    <select
                      value={context.standard}
                      onChange={(e) =>
                        setContext({
                          ...context,
                          standard: e.target.value as AssignmentContext['standard'],
                        })
                      }
                    >
                      {['C++11', 'C++14', 'C++17', 'C++20', 'C++23'].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Lab assignment title
                    <input
                      maxLength={150}
                      placeholder="e.g. Lab 04 · Digit operations"
                      value={context.title}
                      onChange={(e) => setContext({ ...context, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Assignment requirements
                    <textarea
                      rows={3}
                      maxLength={2000}
                      placeholder="What should the program do?"
                      value={context.requirements}
                      onChange={(e) => setContext({ ...context, requirements: e.target.value })}
                    />
                  </label>
                  <label>
                    Topics taught in class
                    <input
                      maxLength={1000}
                      placeholder="Loops, functions, arrays…"
                      value={context.topics}
                      onChange={(e) => setContext({ ...context, topics: e.target.value })}
                    />
                  </label>
                  <label>
                    Teacher’s restrictions
                    <input
                      maxLength={1000}
                      placeholder="e.g. No recursion"
                      value={context.restrictions}
                      onChange={(e) => setContext({ ...context, restrictions: e.target.value })}
                    />
                  </label>
                </div>
                <div className="aside-note">
                  <Lightbulb size={18} />
                  <p>
                    Bring a program you want to understand. You don’t need a perfect solution to
                    start learning.
                  </p>
                </div>
              </aside>
            </div>
            <div className="panel analyze-bar">
              <div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to send this code and context to OpenAI when I request live analysis.
                  </span>
                </label>
                <p className="muted small">
                  Temporary live session state is held in Redis for up to 24 hours.{' '}
                  <button className="text-button" onClick={() => navigate('privacy')}>
                    Privacy details
                  </button>
                </p>
                {status && !status.live && (
                  <p className="small warning-text">
                    Live AI is not configured. You can explore the predefined demo below.
                  </p>
                )}
                {needsChallenge && status?.live && (
                  <SecurityCheck key={challengeKey} onToken={setToken} siteKey={status?.siteKey} />
                )}
              </div>
              <button
                className="btn primary large"
                disabled={
                  Boolean(busy) ||
                  !code.trim() ||
                  !consent ||
                  !liveAllowed ||
                  code.length > (status?.maxCode || 30000)
                }
                onClick={() => void analyze()}
              >
                <Sparkles size={17} />
                Analyze My Code
                <ArrowRight size={17} />
              </button>
            </div>
            <div className="demo-choice">
              <span className="muted small">
                Want a guided preview? Demo content uses built-in code, not your editor.
              </span>
              {DEMOS.map((d, i) => (
                <button key={d.name} className="btn ghost" onClick={() => demo(i)}>
                  Try {d.name}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
        {view === 'analysis' && session && (
          <div className="content">
            <div className="breadcrumbs">
              SOURCE RECEIVED
              <ChevronRight size={12} />
              <span>CODE UNDERSTANDING</span>
            </div>
            <div className="page-heading">
              <div>
                <p className="eyebrow">02 / UNDERSTAND THE TERRAIN</p>
                <h1>Let’s see what’s in your code.</h1>
                <p className="muted">A source-grounded starting point for your interview.</p>
              </div>
              <button className="btn secondary" onClick={editor}>
                <ArrowLeft size={15} />
                Edit code
              </button>
            </div>
            <div className={`notice ${isDemo ? 'demo-notice' : ''}`}>
              {isDemo
                ? 'DEMO · Curated report, predefined questions, simulated keyword grading. Demo modes share the same question bank.'
                : 'AI interpretation · Source quotes are checked for exact line matches; concepts, purpose, and potential issues still need your judgment.'}{' '}
              Code has not been compiled or executed.
            </div>
            <div className="analysis-grid">
              <div>
                <section className="panel">
                  <div className="row between">
                    <h2>Code Understanding Report</h2>
                    <span className="badge violet">{session.analysis.difficulty}</span>
                  </div>
                  <p className="eyebrow report-label">WHAT IT APPEARS TO DO · INTERPRETATION</p>
                  <p className="summary-text">{session.analysis.summary}</p>
                  <h3>
                    Detected concepts{' '}
                    <span className="muted small">· AI interpretation with source evidence</span>
                  </h3>
                  <div className="chips">
                    {session.analysis.concepts.map((c) => (
                      <span className="badge" key={c.name}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                  <div className="evidence-list">
                    {session.analysis.concepts.map((c) => (
                      <details key={c.name}>
                        <summary>
                          {c.name}
                          <span>
                            Lines {c.evidence.start}–{c.evidence.end}
                          </span>
                        </summary>
                        <p className="small muted">
                          Verified quote from your source. This does not prove semantic correctness.
                        </p>
                        <pre>{c.evidence.snippet}</pre>
                      </details>
                    ))}
                  </div>
                </section>
                <section className="panel review-panel">
                  <h2>Sections worth reviewing</h2>
                  {session.analysis.review.map((r, i) => (
                    <div key={i}>
                      <p>{r.explanation}</p>
                      <p className="small accent">
                        Lines {r.evidence.start}–{r.evidence.end}
                      </p>
                      <pre>{r.evidence.snippet}</pre>
                    </div>
                  ))}
                  <h3>Potential problem areas</h3>
                  {session.analysis.risks.length ? (
                    <ul className="risk-list">
                      {session.analysis.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">
                      No specific issues identified. This is not proof of correctness.
                    </p>
                  )}
                </section>
              </div>
              <aside className="panel interview-config">
                <p className="eyebrow">03 / SET YOUR CHALLENGE</p>
                <h2>Your interview, your pace.</h2>
                <label>
                  Difficulty
                  <select
                    value={config.difficulty}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        difficulty: e.target.value as InterviewConfig['difficulty'],
                      })
                    }
                  >
                    {['Beginner', 'Normal TA', 'Strict TA'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Main questions
                  <select
                    value={config.count}
                    onChange={(e) =>
                      setConfig({ ...config, count: Number(e.target.value) as 5 | 10 | 15 })
                    }
                  >
                    {[5, 10, 15].map((v) => (
                      <option key={v} value={v}>
                        {v} questions
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Interview mode
                  <select
                    value={config.mode}
                    onChange={(e) =>
                      setConfig({ ...config, mode: e.target.value as InterviewConfig['mode'] })
                    }
                  >
                    {[
                      'Standard TA Interview',
                      'Explain My Code',
                      'Debugging Challenge',
                      'Rapid Fire',
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <p className="small muted">
                  {config.mode === 'Standard TA Interview'
                    ? 'Concepts, tracing, and edge cases in one interview.'
                    : config.mode === 'Explain My Code'
                      ? 'Focus on why each choice and statement works.'
                      : config.mode === 'Debugging Challenge'
                        ? 'Reason about possible bugs and hypothetical code changes.'
                        : 'Short prompts to practice clear, concise explanations.'}
                </p>
                {config.mode === 'Rapid Fire' && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.timer}
                      onChange={(e) => setConfig({ ...config, timer: e.target.checked })}
                    />
                    Show an elapsed timer (no score penalty)
                  </label>
                )}
                <div className="config-note">
                  <MessageSquare size={17} />
                  <span>
                    One question at a time.
                    <br />
                    At most one follow-up each.
                  </span>
                </div>
                {!isDemo && (
                  <>
                    <p className="muted small">
                      Default daily allowance: 25 provider requests per browser identity. A
                      15-question interview with many follow-ups may reach the cap. Progress remains
                      saved.
                    </p>
                    <SecurityCheck
                      key={challengeKey}
                      onToken={setToken}
                      siteKey={status?.siteKey}
                    />
                  </>
                )}
                <button
                  className="btn primary full"
                  disabled={Boolean(busy) || (!isDemo && !liveAllowed)}
                  onClick={() => void start()}
                >
                  Begin Interview
                  <ArrowRight size={17} />
                </button>
                <p className="small muted center">Practice estimates. No official grades.</p>
              </aside>
            </div>
          </div>
        )}
        {view === 'interview' && session && current && (
          <div className="interview-page">
            <div className="interview-heading">
              <button className="text-button" onClick={editor}>
                <ArrowLeft size={15} />
                Workspace
              </button>
              <div className="row">
                <span className="badge">{session.config.difficulty}</span>
                <span className="small muted">
                  {isDemo ? 'DEMO · SIMULATED' : 'LIVE AI PRACTICE'}
                </span>
              </div>
            </div>
            <div className="interview-progress">
              <div>
                <span>
                  QUESTION {Math.min(session.index + 1, session.total)} OF {session.total}
                </span>
                <span>{session.records.length} main answers recorded</span>
              </div>
              <progress
                value={session.records.length}
                max={session.total}
                aria-label="Interview progress"
              />
            </div>
            <div className="mobile-tabs">
              <button className={!mobileCode ? 'active' : ''} onClick={() => setMobileCode(false)}>
                Question
              </button>
              <button className={mobileCode ? 'active' : ''} onClick={() => setMobileCode(true)}>
                Source code
              </button>
            </div>
            <div className="interview-grid">
              <section className={`panel source-panel ${mobileCode ? 'mobile-visible' : ''}`}>
                <div className="editor-toolbar">
                  <span>
                    <FileCode2 size={16} />
                    Submitted source
                  </span>
                  <span className="small muted">READ ONLY · {session.context.standard}</span>
                </div>
                <CodeEditor value={session.code} readOnly highlight={current.evidence} />
                <div className="source-footnote">
                  <span className="focus-square" />
                  Lines {current.evidence.start}–{current.evidence.end} in focus · Code is not
                  executed
                </div>
              </section>
              <section
                className={`panel question-panel ${!mobileCode ? 'mobile-visible' : ''}`}
                aria-label="Current interview question"
              >
                <div className="row">
                  <span className="ta-avatar">TA</span>
                  <div>
                    <b>Your practice TA</b>
                    <p className="small muted">
                      {session.stage === 'followup'
                        ? 'FOLLOW-UP · ONE LEVEL ONLY'
                        : current.concept.toUpperCase()}
                    </p>
                  </div>
                  {session.config.timer && (
                    <span className="timer">
                      <Clock size={13} />
                      {elapsed}s
                    </span>
                  )}
                </div>
                <h1 className="question-title">{current.text}</h1>
                <p className="small muted">
                  Source lines {current.evidence.start}–{current.evidence.end} ·{' '}
                  {session.stage === 'followup'
                    ? 'Clarify your reasoning.'
                    : 'Take a breath. Explain it in your own words.'}
                </p>
                {isDemo && (
                  <div className="notice demo-notice small">
                    Demo uses predefined questions and keyword-based sample feedback. It cannot
                    judge the meaning of your answer.
                  </div>
                )}
                {!showFeedback && (
                  <>
                    <label className="answer-label">
                      Your answer <span>English or 繁體中文</span>
                      <textarea
                        value={answer}
                        maxLength={4000}
                        rows={7}
                        placeholder="I used this because…"
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </label>
                    <div className="answer-meta">
                      <span>Clear reasoning beats perfect wording.</span>
                      <span>{answer.length}/4000</span>
                    </div>
                    <VoiceInput
                      disabled={Boolean(busy)}
                      onTranscript={(text) =>
                        setAnswer((previous) =>
                          ((previous ? previous + ' ' : '') + text).slice(0, 4000),
                        )
                      }
                    />
                    {session.hint && (
                      <div className="hint-box">
                        <Lightbulb size={17} />
                        <p>{session.hint}</p>
                      </div>
                    )}
                    {!isDemo && (
                      <SecurityCheck
                        key={challengeKey}
                        onToken={setToken}
                        siteKey={status?.siteKey}
                      />
                    )}
                    <div className="question-actions">
                      <button
                        className="btn primary"
                        disabled={Boolean(busy) || !answer.trim() || (!isDemo && !liveAllowed)}
                        onClick={() => void action('answer')}
                      >
                        Submit Answer
                        <ArrowUpRight size={16} />
                      </button>
                      <button
                        className="btn ghost"
                        disabled={Boolean(busy)}
                        onClick={() => void action('hint')}
                      >
                        <Lightbulb size={16} />
                        Hint
                      </button>
                      <button
                        className="btn ghost"
                        disabled={Boolean(busy)}
                        onClick={() => void action('skip')}
                      >
                        <SkipForward size={16} />
                        Skip
                      </button>
                    </div>
                  </>
                )}
                {showFeedback && last && (
                  <div className="feedback" aria-live="polite">
                    <div className="feedback-score">
                      <CheckCircle2 size={19} />
                      <b>
                        {last.followUp ? last.followUp.feedback.score : last.feedback.score}
                        <span>/10</span>
                      </b>
                      <span>
                        {last.skipped || last.followUp?.skipped
                          ? 'Skipped · review and retry'
                          : 'Practice assessment'}
                      </span>
                    </div>
                    {(() => {
                      const f = last.followUp?.feedback || last.feedback;
                      return (
                        <>
                          <div className="rubric-grid">
                            <div>
                              <b>{f.correctness}/4</b>
                              <span>Correctness</span>
                            </div>
                            <div>
                              <b>{f.understanding}/4</b>
                              <span>Understanding</span>
                            </div>
                            <div>
                              <b>{f.reasoning}/2</b>
                              <span>Consequences</span>
                            </div>
                          </div>
                          <p>{f.explanation}</p>
                          {f.missing.length > 0 && (
                            <>
                              <h3>Build on this</h3>
                              <ul>
                                {f.missing.map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </>
                          )}
                          <h3>A clear answer could be</h3>
                          <div className="model-answer">{f.modelAnswer}</div>
                          <details>
                            <summary>Expected key points &amp; grading rubric</summary>
                            <ul>
                              {f.expected.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                            <p className="small muted">{f.rubric}</p>
                          </details>
                        </>
                      );
                    })()}
                    {last.followUp && (
                      <p className="small muted">
                        {last.followUp.skipped
                          ? `Follow-up skipped · final ${last.finalScore}/10 (initial retained)`
                          : `Initial ${last.initialScore}/10 · follow-up ${last.followUp.feedback.score}/10 · final ${last.finalScore}/10 (mean)`}
                      </p>
                    )}
                    <button
                      className="btn primary full"
                      disabled={Boolean(busy)}
                      onClick={() => void action('next')}
                    >
                      {session.index + 1 >= session.total
                        ? 'Continue / View Report'
                        : 'Continue to Next Question'}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <div className="session-save">
                  <ShieldCheck size={13} />
                  Saved on this browser. Live sessions can resume for 24 hours.
                </div>
              </section>
            </div>
          </div>
        )}
        {view === 'report' && session && (
          <PracticeReport
            session={session}
            onRetry={() => void retry()}
            onNew={newInterview}
            onEditor={editor}
          />
        )}
        {view === 'history' && (
          <div className="content history-page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR PRACTICE LOG</p>
                <h1>Understanding takes practice.</h1>
                <p className="muted">Your 15 most recent sessions, stored on this browser.</p>
              </div>
              <button className="btn primary" onClick={() => navigate('editor')}>
                <Plus size={16} />
                New practice
              </button>
            </div>
            <div className="notice">
              History stays on this device and can be lost if browser storage is cleared. Source and
              answered-question feedback are included in exports. Live server state expires after 24
              hours.
            </div>
            {history.length ? (
              <>
                <div className="actions history-actions">
                  <button
                    className="btn secondary"
                    onClick={() => downloadJson(history, 'codedefense-progress.json')}
                  >
                    <Download size={16} />
                    Export Progress
                  </button>
                  <button
                    className="btn ghost danger-text"
                    onClick={() => void removeHistory()}
                    disabled={Boolean(busy)}
                  >
                    <Trash2 size={16} />
                    Delete History
                  </button>
                </div>
                <div className="history-list">
                  {history.map((s) => {
                    const report = summarize(s.records, s.total);
                    return (
                      <article className="panel history-card" key={s.id}>
                        <span className="history-icon">
                          <FileCode2 size={23} />
                        </span>
                        <div className="history-details">
                          <h2>{s.context.title || 'Untitled C++ practice'}</h2>
                          <p className="small muted">
                            {new Date(s.createdAt).toLocaleString()} · {s.demo ? 'Demo' : 'Live AI'}{' '}
                            ·{' '}
                            {s.stage === 'complete'
                              ? 'Complete'
                              : s.stage === 'analysis'
                                ? 'Analyzed'
                                : 'In progress'}
                          </p>
                          <p className="small muted">
                            Practice next:{' '}
                            {report.weak.join(', ') ||
                              'Answer more questions to discover weak topics.'}
                          </p>
                        </div>
                        <strong className="history-score">
                          {s.stage === 'complete' ? `${report.overall}%` : '—'}
                        </strong>
                        <button
                          className="btn secondary"
                          disabled={Boolean(busy)}
                          onClick={() => void resume(s)}
                        >
                          {s.stage === 'complete' ? 'Review' : 'Resume'}
                          <ArrowRight size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <History size={38} />
                <h2>Your first practice starts here.</h2>
                <p className="muted">Bring your code or explore a guided demo.</p>
                <button className="btn primary" onClick={() => demo()}>
                  Try Demo
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        {view === 'privacy' && (
          <div className="content prose-page">
            <p className="eyebrow">CLEAR EXPECTATIONS</p>
            <h1>Your code, your choice.</h1>
            <section className="panel">
              <h2>What happens to your data</h2>
              <p>
                When you request live analysis or answer evaluation, your source, assignment
                context, question, and relevant answers are sent to OpenAI. AI requests use store:
                false; this does not override the provider’s own retention and abuse-monitoring
                policies.
              </p>
              <p>
                Live session state, including source and private grading keys, is temporarily stored
                in Upstash Redis for up to 24 hours from creation. Usage counters and aggregate
                token totals are retained briefly for abuse and cost control. A signed browser
                cookie identifies your anonymous session; hashed IP identifiers support shared
                limits.
              </p>
              <p>
                Practice history and editor drafts are saved locally on this device. Anyone with
                access to this browser profile may be able to read them. Exports contain your source
                and answers. Clearing browser storage removes local history and may prevent
                live-session recovery.
              </p>
              <p>
                Raw code and answers are not intentionally written to application server logs.
                Hosting and service providers may still process request metadata. The application
                never compiles or executes student code.
              </p>
              <h2>Delete your data</h2>
              <p>
                Use Delete History to remove local history and drafts and request deletion of
                reachable live sessions. If a server session cannot be reached, it expires
                automatically within 24 hours. Usage counters remain until their short expiry to
                prevent quota bypass.
              </p>
              <button className="btn secondary" onClick={() => navigate('history')}>
                Manage History
                <ArrowRight size={16} />
              </button>
              <h2>Learning, not official assessment</h2>
              <p>
                CodeDefense is an independent practice tool, not affiliated with National Tsing Hua
                University. Scores are informal estimates. AI can make mistakes; check explanations
                against your source and course material. Follow your instructor’s rules when sharing
                coursework.
              </p>
              <p>
                Demo questions and feedback are predefined and simulated. They never use an AI
                provider or analyze arbitrary pasted code.
              </p>
            </section>
          </div>
        )}
        {view === 'how' && (
          <div className="content prose-page">
            <p className="eyebrow">A SMALL REHEARSAL. A CLEARER EXPLANATION.</p>
            <h1>Make your logic speak.</h1>
            <section className="panel">
              <h2>1. Bring your source</h2>
              <p>
                Paste C++ or upload UTF-8 .cpp / .txt text. Add optional lab context and choose your
                C++ standard. Code is read, never executed.
              </p>
              <h2>2. Check the understanding report</h2>
              <p>
                Review detected concepts and tentative explanations. Expand evidence to see exact
                source lines. A quote matching the source does not prove an AI interpretation is
                correct.
              </p>
              <h2>3. Rehearse your demonstration</h2>
              <p>
                Choose 5, 10, or 15 questions and a mode. Explain the reasoning in English or
                Traditional Chinese. Ask for a hint, skip if stuck, or work through one follow-up.
              </p>
              <h2>4. Turn feedback into practice</h2>
              <p>
                Each answer has 4 points for technical correctness, 4 for understanding, and 2 for
                relevant consequences. A concise complete explanation can score 10. A follow-up
                produces a final score equal to the mean of the initial and follow-up scores, with
                both visible.
              </p>
              <p>
                Review your report, retry questions below 8/10, and print or export your progress.
                The demo uses illustrative keyword scores and a shared question bank across modes;
                live AI adapts question selection and feedback.
              </p>
              <div className="actions">
                <button className="btn primary" onClick={() => navigate('editor')}>
                  Start Practicing
                  <ArrowRight size={16} />
                </button>
                <button className="btn secondary" onClick={() => demo()}>
                  Try Demo
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="footer no-print">
        <span>
          <Braces size={16} />
          CodeDefense<span className="muted">Learn the why behind your code.</span>
        </span>
        <div>
          <button onClick={() => navigate('privacy')}>Privacy &amp; AI usage</button>
          <span>Independent student project · Not affiliated with NTHU</span>
        </div>
      </footer>
    </div>
  );
}
