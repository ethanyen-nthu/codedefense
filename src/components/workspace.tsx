'use client';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, LoaderCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Home } from './home';
import { Logo } from './logo';
import { ThemeSelector } from './theme';
import { EditorScreen } from './editor-screen';
import { AnalysisScreen } from './analysis-screen';
import { Interview } from './interview';
import { HistoryScreen, LearningScreen, ProgramsScreen } from './learning';
import { Privacy } from './privacy';
import { PracticeReport } from './practice-report';
import {
  configSchema,
  contextSchema,
  emptyContext,
  kinds,
  type Analysis,
  type AssignmentContext,
  type PracticeSession,
  type Kind,
} from '@/lib/schemas';
import { createSession, retryWeak } from '@/lib/engine';
import { EXAMPLES } from '@/lib/examples';
import {
  ACTIVE_KEY,
  DRAFT_KEY,
  loadHistory,
  saveHistory,
  clearHistory,
  removeSession,
  importHistory,
  legacyHistory,
  loadPrograms,
  saveProgram,
  deleteProgram,
  type SavedProgram,
} from '@/lib/storage';
import { validateSource } from '@/lib/source';
type View =
  | 'home'
  | 'editor'
  | 'analysis'
  | 'interview'
  | 'report'
  | 'history'
  | 'privacy'
  | 'how'
  | 'weak'
  | 'programs';
const NAV: [View, string][] = [
  ['editor', 'Practice'],
  ['weak', 'Review'],
  ['programs', 'Programs'],
  ['history', 'History'],
  ['how', 'How it works'],
];
export function Workspace() {
  const [view, setView] = useState<View>('home'),
    [code, setCode] = useState(''),
    [context, setContext] = useState<AssignmentContext>(emptyContext),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [config, setConfig] = useState(configSchema.parse({}));
  const [session, setSession] = useState<PracticeSession | null>(null),
    [history, setHistory] = useState<PracticeSession[]>([]),
    [programs, setPrograms] = useState<SavedProgram[]>([]),
    [legacy, setLegacy] = useState<unknown[]>([]),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [warning, setWarning] = useState(''),
    [notice, setNotice] = useState(''),
    [navOpen, setNavOpen] = useState(false);
  const pending = useRef(false),
    positions = useRef<Partial<Record<View, number>>>({}),
    restoring = useRef(false),
    main = useRef<HTMLElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-local state only after static HTML renders.
    setHistory(loadHistory());
    setPrograms(loadPrograms());
    setLegacy(legacyHistory());
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (typeof draft?.code === 'string') setCode(draft.code);
      const ctx = contextSchema.safeParse(draft?.context);
      if (ctx.success) setContext(ctx.data);
      const active = loadHistory().find((s) => s.id === localStorage.getItem(ACTIVE_KEY));
      const hash = location.hash.slice(1) as View;
      if (active && !['history', 'privacy', 'how', 'programs', 'weak'].includes(hash)) {
        setSession(active);
        setView(active.stage === 'complete' ? 'report' : 'interview');
      } else if (['editor', 'history', 'privacy', 'how', 'programs', 'weak'].includes(hash))
        setView(hash);
    } catch {
      setWarning('Browser storage could not be read. Keep source and history backups.');
    }
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ code, context }));
      } catch {
        setWarning('Draft storage is full or unavailable. Keep a source copy.');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [code, context]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      try {
        saveHistory(session);
        setHistory(loadHistory());
      } catch {
        setWarning('History storage is unavailable. Export this session before closing.');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    if (!restoring.current) return;
    restoring.current = false;
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: positions.current[view] || 0, behavior: 'instant' });
  }, [view]);
  function navigate(next: View) {
    positions.current[view] = window.scrollY;
    restoring.current = true;
    setView(next);
    setNavOpen(false);
    setError('');
    setNotice('');
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    window.history.replaceState(null, '', `#${next}`);
  }
  function persist(s: PracticeSession) {
    setSession(s);
    setView(s.stage === 'complete' ? 'report' : 'interview');
    try {
      saveHistory(s);
      setHistory(loadHistory());
      localStorage.setItem(ACTIVE_KEY, s.id);
    } catch {
      setWarning('Unable to save locally. Download this session to keep it.');
    }
  }
  async function run(label: string, work: () => void | Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(label);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy('');
      pending.current = false;
    }
  }
  async function analyze(source = code, title?: string) {
    await run('Parsing C++ locally…', async () => {
      const valid = validateSource(source);
      const { analyzeCpp } = await import('@/lib/analyzer');
      const result = await analyzeCpp(valid);
      setCode(valid);
      if (title) setContext({ ...emptyContext, title });
      setAnalysis(result);
      navigate('analysis');
    });
  }
  function action(work: () => PracticeSession) {
    void run('Updating practice…', () => persist(work()));
  }
  function editor() {
    if (session) {
      setCode(session.code);
      setContext(session.context);
    }
    navigate('editor');
  }
  function fresh() {
    if (!session) return;
    setCode(session.code);
    setContext(session.context);
    setAnalysis(session.analysis);
    setConfig({ ...session.config, seed: '' });
    navigate('analysis');
  }
  function deleteOne(id: string) {
    if (confirm('Delete this session from this browser?'))
      void run('Deleting local session…', () => {
        removeSession(id);
        setHistory(loadHistory());
        if (session?.id === id) setSession(null);
      });
  }
  function clear() {
    if (
      confirm(
        'Clear all practice history and its source draft on this browser? Saved programs remain in Programs.',
      )
    )
      void run('Clearing history…', () => {
        clearHistory();
        setHistory([]);
        setSession(null);
        setCode('');
        setContext(emptyContext);
      });
  }
  function saveCurrent() {
    void run('Saving program…', () => {
      const source = validateSource(code);
      const name = context.title.trim() || 'Untitled program';
      const existing = programs.find((p) => p.name === name);
      if (existing && !confirm(`Replace the saved program “${name}”?`)) return;
      saveProgram({
        id: existing?.id || crypto.randomUUID(),
        name,
        code: source,
        context,
        updatedAt: new Date().toISOString(),
      });
      setPrograms(loadPrograms());
      setNotice('Program saved on this browser.');
    });
  }
  function practiceTopic(previous: PracticeSession, kind: Kind) {
    void run('Preparing related review…', async () => {
      const { analyzeCpp } = await import('@/lib/analyzer');
      const a = await analyzeCpp(previous.code);
      persist(
        createSession(
          previous.code,
          a,
          previous.context,
          {
            ...configSchema.parse({}),
            count: 5,
            difficulty: 'Beginner',
            excluded: kinds.filter((k) => k !== kind),
          },
          history,
        ),
      );
    });
  }
  function loadProgram(p: SavedProgram) {
    setCode(p.code);
    setContext(p.context);
    navigate('editor');
  }
  return (
    <div
      className={`app-shell ${view === 'interview' && session?.config.mode === 'TA Demo Mode' ? 'demo-mode' : ''}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="CodeTA home">
          <Logo />
          <span>
            Code<span className="brand-light">TA</span>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV.map(([v, label]) => (
            <button
              aria-current={view === v ? 'page' : undefined}
              key={v}
              onClick={() => navigate(v)}
            >
              {label}
            </button>
          ))}
        </nav>
        <ThemeSelector />
        <button
          className="icon-btn mobile-menu"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <X /> : <Menu />}
        </button>
      </header>
      {navOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV.map(([v, label]) => (
            <button key={v} onClick={() => navigate(v)}>
              {label}
            </button>
          ))}
        </nav>
      )}
      <main ref={main} id="main" tabIndex={-1}>
        {warning && (
          <div className="notice warning global-notice" role="status">
            {warning}
          </div>
        )}
        {notice && (
          <div className="notice global-notice" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="error-banner global-notice" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="icon-btn" aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {busy && (
          <div className="busy-banner" role="status">
            <LoaderCircle size={16} className="spin" />
            {busy}
          </div>
        )}
        <div className="screen" key={view}>
          {view === 'home' && (
            <>
              <Home
                onStart={() => navigate('editor')}
                onDemo={() => void analyze(EXAMPLES[0].code, EXAMPLES[0].name)}
                onHow={() => navigate('how')}
              />
              {history.length > 0 && (
                <div className="content resume-strip">
                  <span>Your last practice is saved on this browser.</span>
                  <button className="btn secondary" onClick={() => persist(history[0])}>
                    Resume / Review
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {view === 'editor' && (
            <EditorScreen
              code={code}
              setCode={setCode}
              context={context}
              setContext={setContext}
              onAnalyze={() => void analyze()}
              onSave={saveCurrent}
              busy={Boolean(busy)}
              onError={setError}
            />
          )}
          {view === 'analysis' && analysis && (
            <AnalysisScreen
              analysis={analysis}
              config={config}
              onConfig={setConfig}
              onEdit={() => navigate('editor')}
              busy={Boolean(busy)}
              onBegin={() => action(() => createSession(code, analysis, context, config, history))}
            />
          )}
          {view === 'interview' && session && (
            <Interview
              session={session}
              onChange={action}
              onDraft={(patch) => setSession((s) => (s ? { ...s, ...patch } : s))}
              onBack={editor}
            />
          )}
          {view === 'report' && session && (
            <PracticeReport
              session={session}
              onRetry={() => action(() => retryWeak(session))}
              onNew={fresh}
              onEditor={editor}
            />
          )}
          {view === 'history' && (
            <HistoryScreen
              history={history}
              onResume={persist}
              onDelete={deleteOne}
              onClear={clear}
              onImport={(file) =>
                void run('Validating local history…', async () => {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error('History files must be at most 5 MB.');
                  const count = importHistory(await file.text());
                  setHistory(loadHistory());
                  setPrograms(loadPrograms());
                  setNotice(
                    `Imported ${count} session(s). Saved programs are included when present.`,
                  );
                })
              }
              legacy={legacy}
              onDeleteLegacy={() => {
                if (confirm('Delete the legacy paid-version history and draft from this browser?'))
                  void run('Deleting legacy records…', () => {
                    for (const key of [
                      'codedefense-history-v1',
                      'codedefense-draft-v1',
                      'codedefense-active-v1',
                    ])
                      localStorage.removeItem(key);
                    setLegacy([]);
                  });
              }}
            />
          )}
          {view === 'weak' && <LearningScreen history={history} onPractice={practiceTopic} />}
          {view === 'programs' && (
            <ProgramsScreen
              programs={programs}
              onLoad={loadProgram}
              onDelete={(id) => {
                if (confirm('Delete this saved program from this browser?'))
                  void run('Deleting program…', () => {
                    deleteProgram(id);
                    setPrograms(loadPrograms());
                  });
              }}
            />
          )}
          {view === 'privacy' && (
            <div className="content prose-page">
              <p className="eyebrow">LOCAL FIRST</p>
              <h1>Your code stays yours.</h1>
              <Privacy />
            </div>
          )}
          {view === 'how' && (
            <div className="content prose-page">
              <p className="eyebrow">A PRACTICE PARTNER, NOT A GRADER</p>
              <h1>Explain it. Test your reasoning.</h1>
              <section className="panel">
                <h2>1. Bring your program</h2>
                <p>
                  Paste or upload UTF-8 C++11 source. The bundled WASM parser detects actual syntax
                  locally; repair syntax diagnostics before starting. It does not compile, execute,
                  or prove your program correct.
                </p>
                <h2>2. Set your challenge</h2>
                <p>
                  Choose Fundamentals, Beginner, Normal TA (default), Strict TA, or Challenge. Every
                  level shows its focus and an example. Questions stay tied to detected concepts; a
                  small program can support fewer than your requested 5, 10, or 15 questions.
                </p>
                <h2>3. Explain before seeing the reference</h2>
                <p>
                  Written modes show references only after you submit or skip. Compare expected
                  points and self-assess. Multiple choice uses exact keys and explains each choice.
                  “Explain More Simply” uses prewritten material.
                </p>
                <h2>4. Adapt only if you choose</h2>
                <p>
                  Adaptive Practice is off by default. When enabled, weak responses or hints lower
                  the next level by one; three strong, hint-free responses raise it by one. Changes
                  preserve recorded answers and regenerate only remaining questions. These signals
                  are practice guidance, not proof of mastery.
                </p>
                <h2>5. Return to what matters</h2>
                <p>
                  Review weak concepts, save programs, resume after refresh, and print or export
                  reports. Offline practice uses cached bundled assets after a successful online
                  load. Storage and cache eviction are controlled by your browser.
                </p>
                <h2>Moving from the old site</h2>
                <p>
                  Export History on codedefense-free.pages.dev, then import the file in CodeTA
                  History. New hostnames have separate storage. CodeTA accepts original Free Edition
                  v2 records without deleting originals.
                </p>
                <button className="btn primary" onClick={() => navigate('editor')}>
                  Start Practicing
                  <ArrowRight size={16} />
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
      <footer className="footer no-print">
        <div>
          <b>Made by Ethan Yen</b>
          <span>For NTHU Programming Classes</span>
          <small>
            Independent student project. Not officially affiliated with National Tsing Hua
            University.
          </small>
        </div>
        <div className="footer-links">
          <a href="https://github.com/ethanyen-nthu/codedefense" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <button onClick={() => navigate('privacy')}>Privacy</button>
          <span>C++11 · Local & free</span>
        </div>
      </footer>
    </div>
  );
}
