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
  Lightbulb,
  SkipForward,
  AlertCircle,
  LoaderCircle,
  Download,
  Menu,
  X,
  Plus,
  CheckCircle2,
  FolderInput,
} from 'lucide-react';
import { Home } from './home';
import { Privacy } from './privacy';
import { PracticeReport } from './practice-report';
import {
  configSchema,
  contextSchema,
  emptyContext,
  type Analysis,
  type AssignmentContext,
  type InterviewConfig,
  type PracticeSession,
  type Assessment,
} from '@/lib/schemas';
import { EXAMPLES } from '@/lib/examples';
import {
  createSession,
  submit,
  assess,
  advance,
  followUp,
  canAdvance,
  retryWeak,
  summarize,
  generateQuestions,
} from '@/lib/engine';
import {
  ACTIVE_KEY,
  DRAFT_KEY,
  loadHistory,
  saveHistory,
  clearHistory,
  removeSession,
  exportHistory,
  importHistory,
  downloadJson,
  legacyHistory,
} from '@/lib/storage';
import { readSourceFile, validateSource } from '@/lib/source';
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
const assessments: [Assessment, string][] = [
  ['complete', 'I understood completely / 完全理解'],
  ['partial', 'I understood partially / 部分理解'],
  ['not-yet', 'I did not understand / 尚未理解'],
];
export function Workspace() {
  const [view, setView] = useState<View>('home'),
    [code, setCode] = useState(''),
    [context, setContext] = useState<AssignmentContext>(emptyContext),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [config, setConfig] = useState<InterviewConfig>(configSchema.parse({}));
  const [session, setSession] = useState<PracticeSession | null>(null),
    [history, setHistory] = useState<PracticeSession[]>([]),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [storageWarning, setStorageWarning] = useState(''),
    [mobileCode, setMobileCode] = useState(false),
    [navOpen, setNavOpen] = useState(false),
    [legacy, setLegacy] = useState<unknown[]>([]);
  const upload = useRef<HTMLInputElement>(null),
    historyUpload = useRef<HTMLInputElement>(null),
    pending = useRef(false);
  useEffect(() => {
    const list = loadHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only storage after the static HTML first renders.
    setHistory(list);
    setLegacy(legacyHistory());
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (typeof draft?.code === 'string') setCode(draft.code);
      const parsed = contextSchema.safeParse({ ...draft?.context, standard: 'C++11' });
      if (parsed.success) setContext(parsed.data);
      const active = list.find((s) => s.id === localStorage.getItem(ACTIVE_KEY));
      if (active) {
        setSession(active);
        setView(active.stage === 'complete' ? 'report' : 'interview');
      } else {
        const hash = window.location.hash.slice(1);
        if (['editor', 'history', 'privacy', 'how'].includes(hash)) setView(hash as View);
      }
    } catch {
      setStorageWarning('Browser storage could not be read. Export your reports before leaving.');
    }
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ code, context }));
      } catch {
        setStorageWarning('Draft storage is full or unavailable. Keep a separate source copy.');
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
        setStorageWarning('History could not be saved. Download this session before closing.');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [session]);
  function navigate(next: View) {
    setView(next);
    setNavOpen(false);
    setMobileCode(false);
    setError('');
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    window.history.replaceState(null, '', `#${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function persist(s: PracticeSession) {
    setSession(s);
    setView(s.stage === 'complete' ? 'report' : 'interview');
    setMobileCode(false);
    try {
      saveHistory(s);
      setHistory(loadHistory());
      localStorage.setItem(ACTIVE_KEY, s.id);
    } catch {
      setStorageWarning('Unable to save locally. Export the current session to keep it.');
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
  async function analyze(source = code, exampleTitle?: string) {
    await run('Parsing C++ locally…', async () => {
      const valid = validateSource(source);
      const { analyzeCpp } = await import('@/lib/analyzer');
      const report = await analyzeCpp(valid);
      setCode(valid);
      if (exampleTitle) setContext({ ...emptyContext, title: exampleTitle });
      setAnalysis(report);
      setView('analysis');
    });
  }
  function begin() {
    if (!analysis) return;
    void run('Preparing source-specific questions…', () =>
      persist(createSession(code, analysis, context, config)),
    );
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
    if (!window.confirm('Delete this session from this browser?')) return;
    try {
      removeSession(id);
      setHistory(loadHistory());
      if (session?.id === id) setSession(null);
    } catch {
      setError('Could not delete this session from browser storage.');
    }
  }
  function clear() {
    if (!window.confirm('Clear all Free Edition history and its source draft on this browser?'))
      return;
    try {
      clearHistory();
      setHistory([]);
      setSession(null);
      setCode('');
      setContext(emptyContext);
    } catch {
      setError('Could not clear browser storage.');
    }
  }
  const q = session?.questions[session.index],
    record = session?.records.at(-1),
    isFollow = session?.stage === 'followup' || session?.stage === 'followup-feedback',
    feedback = session?.stage === 'feedback' || session?.stage === 'followup-feedback',
    mc = session?.config.mode === 'Quick Multiple Choice' && !isFollow;
  const displayQuestion = isFollow ? q?.followUp?.text : q?.text,
    reference = isFollow ? q?.followUp?.explanation : q?.explanation,
    expected = isFollow ? q?.followUp?.expected : q?.expected;
  const selectedAssessment =
      session?.stage === 'followup-feedback' ? record?.followUp?.assessment : record?.assessment,
    skipped = session?.stage === 'followup-feedback' ? record?.followUp?.skipped : record?.skipped;
  const pool =
    analysis && !analysis.diagnostics.length
      ? generateQuestions(analysis, { ...config, seed: config.seed || 'preview' }).length
      : 0;
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
        <span className="badge violet">FREE EDITION</span>
        <span className="topbar-label">LOCAL C++ PRACTICE</span>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button onClick={() => navigate('editor')}>Practice</button>
          <button onClick={() => navigate('history')}>History</button>
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
          {(['editor', 'history', 'how', 'privacy'] as View[]).map((v) => (
            <button key={v} onClick={() => navigate(v)}>
              {v === 'editor'
                ? 'Practice'
                : v === 'how'
                  ? 'How it works'
                  : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>
      )}
      <main id="main" tabIndex={-1}>
        {storageWarning && <div className="notice warning global-notice">{storageWarning}</div>}
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
            <LoaderCircle size={17} className="spin" />
            {busy}
          </div>
        )}
        {view === 'home' && (
          <>
            <Home
              onStart={() => navigate('editor')}
              onDemo={() => void analyze(EXAMPLES[0].code, EXAMPLES[0].name)}
              onHow={() => navigate('how')}
            />
            {history.length > 0 && (
              <div className="content resume-strip">
                <History size={20} />
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
          <div className="content editor-page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">01 / BRING YOUR CODE</p>
                <h1>Start with what you wrote.</h1>
                <p className="muted">Real syntax. Local analysis. No account or API key.</p>
              </div>
              <span className="badge">
                <ShieldCheck size={13} />
                Never uploaded or executed
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
                    <button className="toolbar-button" onClick={() => setCode(EXAMPLES[0].code)}>
                      Example
                    </button>
                    <button
                      className="icon-btn"
                      title="Clear code"
                      aria-label="Clear code"
                      onClick={() => {
                        if (!code || window.confirm('Clear your current source draft?'))
                          setCode('');
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <input
                  ref={upload}
                  type="file"
                  accept=".cpp,.txt"
                  hidden
                  aria-label="Upload C++ source file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      void run('Reading local file…', async () => setCode(await readSourceFile(f)));
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
                  <span>C++11 · UTF-8 · text only</span>
                  <span className={code.length > 30000 ? 'danger-text' : ''}>
                    {code.length.toLocaleString()} / 30,000 characters
                  </span>
                </div>
                <p className="small muted editor-caption">
                  .cpp / .txt · 120 KB maximum · 1,500 lines · Tab moves focus
                </p>
              </section>
              <aside className="context-panel">
                <section className="panel">
                  <p className="eyebrow">YOUR LAB NOTES · OPTIONAL</p>
                  <h2>A little context helps you.</h2>
                  <p className="small muted">
                    Saved with your report. These notes do not introduce concepts that are absent
                    from the parsed source.
                  </p>
                  <label>
                    Lab assignment title
                    <input
                      value={context.title}
                      maxLength={150}
                      placeholder="e.g. Armstrong number"
                      onChange={(e) => setContext({ ...context, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Assignment requirements
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={context.requirements}
                      onChange={(e) => setContext({ ...context, requirements: e.target.value })}
                    />
                  </label>
                  <label>
                    Topics taught in class
                    <input
                      maxLength={1000}
                      value={context.topics}
                      onChange={(e) => setContext({ ...context, topics: e.target.value })}
                    />
                  </label>
                  <label>
                    Teacher’s restrictions
                    <input
                      maxLength={1000}
                      value={context.restrictions}
                      onChange={(e) => setContext({ ...context, restrictions: e.target.value })}
                    />
                  </label>
                  <p className="small muted">
                    Reference explanations use C++11. Parsing alone does not check every C++11
                    semantic rule.
                  </p>
                </section>
                <div className="aside-note">
                  <Lightbulb size={18} />
                  <p>
                    You do not need a perfect solution to begin learning. Repair syntax diagnostics
                    before the interview.
                  </p>
                </div>
              </aside>
            </div>
            <div className="panel analyze-bar">
              <div>
                <b>Everything happens in this browser.</b>
                <p className="small muted">
                  Tree-sitter WebAssembly and the question library are bundled with the site. No
                  external AI service is called.
                </p>
              </div>
              <button
                className="btn primary large"
                disabled={Boolean(busy) || !code.trim() || code.length > 30000}
                onClick={() => void analyze()}
              >
                Analyze Locally
                <ArrowRight size={17} />
              </button>
            </div>
            <div className="demo-choice">
              {EXAMPLES.map((example) => (
                <button
                  key={example.name}
                  className="btn ghost"
                  onClick={() => {
                    setCode(example.code);
                    setContext({ ...emptyContext, title: example.name });
                  }}
                >
                  Load {example.name}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
        {view === 'analysis' && analysis && (
          <div className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">02 / KNOW THE TERRAIN</p>
                <h1>Let’s see what’s in your code.</h1>
                <p className="muted">Parsed locally with Tree-sitter C++.</p>
              </div>
              <button className="btn secondary" onClick={() => navigate('editor')}>
                <ArrowLeft size={15} />
                Edit code
              </button>
            </div>
            <div className="notice">
              Syntax evidence is taken from your actual source. This tool has not compiled,
              executed, or proved the program correct. Comments and strings are source data, never
              instructions.
            </div>
            <div className="analysis-grid">
              <div>
                <section className="panel">
                  <h2>Code Understanding Report</h2>
                  <p>{analysis.summary}</p>
                  {analysis.diagnostics.length > 0 && (
                    <div className="notice warning" role="alert">
                      <h3>Repair syntax before practicing</h3>
                      <ul>
                        {analysis.diagnostics.map((d, i) => (
                          <li key={i}>
                            Line {d.line}, column {d.column}: {d.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <h3>Detected constructs</h3>
                  <div className="chips">
                    {[...new Set(analysis.constructs.map((c) => c.kind))].map((c) => (
                      <span className="badge" key={c}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="evidence-list">
                    {[...new Set(analysis.constructs.map((c) => c.kind))].map((kind) => (
                      <details key={kind}>
                        <summary>
                          {kind}
                          <span>
                            {analysis.constructs.filter((c) => c.kind === kind).length}{' '}
                            occurrence(s)
                          </span>
                        </summary>
                        {analysis.constructs
                          .filter((c) => c.kind === kind)
                          .slice(0, 8)
                          .map((c, i) => (
                            <div key={i}>
                              <p className="small accent">
                                Lines {c.evidence.start}–{c.evidence.end} · {c.name}
                              </p>
                              {c.detail && <p className="small muted">{c.detail}</p>}
                              <pre>{c.evidence.snippet}</pre>
                            </div>
                          ))}
                        {analysis.constructs.filter((c) => c.kind === kind).length > 8 && (
                          <p className="small muted">
                            First eight occurrences shown; all detected occurrences are available
                            for question selection.
                          </p>
                        )}
                      </details>
                    ))}
                  </div>
                </section>
                <section className="panel review-panel">
                  <h2>What this analysis can tell you</h2>
                  <ul>
                    {analysis.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
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
                    {[5, 10, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} questions
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
                      'Quick Multiple Choice',
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <p className="small muted">
                  {config.mode === 'Quick Multiple Choice'
                    ? 'Reviewed answer keys provide automatic grading.'
                    : 'Written responses use reference checklists and your own self-assessment. No AI or keyword grading.'}
                </p>
                <label>
                  Question-order seed (optional)
                  <input
                    value={config.seed}
                    maxLength={80}
                    placeholder="Blank for a new random order"
                    onChange={(e) => setConfig({ ...config, seed: e.target.value })}
                  />
                </label>
                {pool > 0 && pool < config.count && (
                  <p className="notice small">
                    Only {pool} distinct reviewed templates fit this source and difficulty. The
                    interview will use {pool}, without padding unrelated questions.
                  </p>
                )}
                <button
                  className="btn primary full"
                  disabled={Boolean(busy) || !pool || analysis.diagnostics.length > 0}
                  onClick={begin}
                >
                  Begin Interview
                  <ArrowRight size={17} />
                </button>
                <p className="small muted center">
                  At most one optional follow-up per main question.
                </p>
              </aside>
            </div>
          </div>
        )}
        {view === 'interview' && session && q && (
          <div className="interview-page">
            <div className="interview-heading">
              <button className="text-button" onClick={editor}>
                <ArrowLeft size={15} />
                Workspace
              </button>
              <div className="row">
                <span className="badge">{session.config.difficulty}</span>
                <span className="small muted">
                  {mc ? 'AUTOMATIC MC GRADING' : 'WRITTEN · SELF-ASSESSMENT'}
                </span>
              </div>
            </div>
            <div className="interview-progress">
              <div>
                <span>
                  QUESTION {session.index + 1} OF {session.questions.length}
                </span>
                <span>{session.records.length} main responses recorded</span>
              </div>
              <progress
                value={session.records.length}
                max={session.questions.length}
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
                  <span className="small muted">READ ONLY · C++11</span>
                </div>
                <CodeEditor value={session.code} readOnly highlight={q.evidence} />
                <div className="source-footnote">
                  <span className="focus-square" />
                  Lines {q.evidence.start}–{q.evidence.end} · Parsed, not executed
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
                      {isFollow ? 'ONE OPTIONAL FOLLOW-UP' : q.concept.toUpperCase()}
                    </p>
                  </div>
                </div>
                <h1 className="question-title">{displayQuestion}</h1>
                <p className="small muted">
                  Source lines {q.evidence.start}–{q.evidence.end} · Explain the reasoning, not just
                  the syntax.
                </p>
                {!feedback && (
                  <>
                    {mc ? (
                      <fieldset className="choice-list">
                        <legend>Choose one answer</legend>
                        {q.choices.map((choice, i) => (
                          <label key={i} className={session.draftChoice === i ? 'selected' : ''}>
                            <input
                              type="radio"
                              name="answer-choice"
                              value={i}
                              checked={session.draftChoice === i}
                              onChange={() => setSession({ ...session, draftChoice: i })}
                            />
                            <span>{choice}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : (
                      <>
                        <label className="answer-label">
                          Your answer <span>English or 繁體中文</span>
                          <textarea
                            rows={7}
                            value={session.draft}
                            maxLength={4000}
                            placeholder="I think this works because…"
                            onChange={(e) => setSession({ ...session, draft: e.target.value })}
                          />
                        </label>
                        <p className="small muted">
                          Your explanation is not automatically graded. You will compare it with a
                          reviewed reference.
                        </p>
                      </>
                    )}
                    {session.hint && (
                      <div className="hint-box">
                        <Lightbulb size={17} />
                        <p>{q.hint}</p>
                      </div>
                    )}
                    <div className="question-actions">
                      <button
                        className="btn primary"
                        disabled={
                          Boolean(busy) ||
                          (mc ? session.draftChoice === null : !session.draft.trim())
                        }
                        onClick={() => action(() => submit(session))}
                      >
                        {mc ? 'Check Answer' : 'Compare My Answer'}
                        <ArrowUpRight size={16} />
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => setSession({ ...session, hint: true })}
                      >
                        <Lightbulb size={16} />
                        Hint
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => action(() => submit(session, true))}
                      >
                        <SkipForward size={16} />
                        Skip
                      </button>
                    </div>
                  </>
                )}
                {feedback && record && (
                  <div className="feedback" aria-live="polite">
                    <div className="feedback-score">
                      <CheckCircle2 size={19} />
                      <b className="result-title">
                        {skipped
                          ? 'Skipped'
                          : mc
                            ? record.choice === q.correctIndex
                              ? 'Correct'
                              : 'Not correct'
                            : 'Compare & reflect'}
                      </b>
                    </div>
                    <p className="notice small">
                      {mc
                        ? 'Automatically checked against this template’s answer key.'
                        : 'Written answer: not automatically graded. Compare the reasoning with each point below, then choose your own assessment.'}
                    </p>
                    {mc && !skipped && <p>Your choice: {q.choices[record.choice!]}</p>}
                    <h3>Reference explanation</h3>
                    <div className="model-answer">{reference}</div>
                    <h3>Expected points to check</h3>
                    <ul>
                      {expected?.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                    {!mc && !skipped && (
                      <fieldset className="assessment-list">
                        <legend>Your self-assessment</legend>
                        {assessments.map(([value, label]) => (
                          <button
                            key={value}
                            className={`btn ${selectedAssessment === value ? 'primary' : 'secondary'}`}
                            aria-pressed={selectedAssessment === value}
                            onClick={() => action(() => assess(session, value))}
                          >
                            {label}
                          </button>
                        ))}
                      </fieldset>
                    )}
                    {!isFollow && q.followUp && !record.followUp && (
                      <button
                        className="btn secondary full"
                        disabled={!canAdvance(session)}
                        onClick={() => action(() => followUp(session))}
                      >
                        Practice one follow-up
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="btn primary full"
                      disabled={!canAdvance(session)}
                      onClick={() => action(() => advance(session))}
                    >
                      {session.index + 1 === session.questions.length
                        ? 'View Practice Report'
                        : 'Next Question'}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <div className="session-save">
                  <ShieldCheck size={13} />
                  Saved on this browser · source and answers stay local
                </div>
              </section>
            </div>
          </div>
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
          <div className="content history-page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR PRACTICE LOG</p>
                <h1>Understanding takes practice.</h1>
                <p className="muted">Up to 15 recent Free Edition sessions on this browser.</p>
              </div>
              <button className="btn primary" onClick={() => navigate('editor')}>
                <Plus size={16} />
                New practice
              </button>
            </div>
            <div className="notice">
              Export a backup before clearing browser storage. Self-assessment and multiple-choice
              records remain separate. Imported files are validated before any history is changed.
            </div>
            <div className="actions history-actions">
              <button
                className="btn secondary"
                disabled={!history.length}
                onClick={() => downloadJson(exportHistory(), 'codedefense-free-history.json')}
              >
                <Download size={16} />
                Export History
              </button>
              <button className="btn secondary" onClick={() => historyUpload.current?.click()}>
                <FolderInput size={16} />
                Import History
              </button>
              <button className="btn ghost danger-text" disabled={!history.length} onClick={clear}>
                <Trash2 size={16} />
                Clear All History
              </button>
            </div>
            <input
              type="file"
              hidden
              ref={historyUpload}
              accept=".json"
              aria-label="Import history file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void run('Validating local history…', async () => {
                    if (file.size > 5 * 1024 * 1024)
                      throw new Error('History files must be at most 5 MB.');
                    importHistory(await file.text());
                    setHistory(loadHistory());
                  });
                e.target.value = '';
              }}
            />
            {legacy.length > 0 && (
              <div className="panel">
                <h2>Earlier paid-version records</h2>
                <p>
                  Preserved separately; legacy AI/demo scores are not mixed with Free Edition
                  results.
                </p>
                <div className="actions">
                  <button
                    className="btn secondary"
                    onClick={() => downloadJson(legacy, 'codedefense-legacy-history.json')}
                  >
                    Export Legacy History
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Delete the legacy paid-version history and draft from this browser?',
                        )
                      ) {
                        localStorage.removeItem('codedefense-history-v1');
                        localStorage.removeItem('codedefense-draft-v1');
                        localStorage.removeItem('codedefense-active-v1');
                        setLegacy([]);
                      }
                    }}
                  >
                    Delete Legacy History
                  </button>
                </div>
              </div>
            )}
            {history.length ? (
              <div className="history-list">
                {history.map((s) => {
                  const summary = summarize(s);
                  return (
                    <article className="panel history-card" key={s.id}>
                      <span className="history-icon">
                        <FileCode2 size={23} />
                      </span>
                      <div className="history-details">
                        <h2>{s.context.title || 'Untitled C++ practice'}</h2>
                        <p className="small muted">
                          {new Date(s.createdAt).toLocaleString()} ·{' '}
                          {s.stage === 'complete' ? 'Complete' : 'In progress'}
                        </p>
                        <p className="small muted">
                          {summary.autoScore === null
                            ? `${summary.complete} understood / ${summary.partial} partial / ${summary.notYet} not yet (self-assessed)`
                            : `MC: ${summary.autoCorrect}/${summary.autoTotal} correct`}{' '}
                          · Practice next: {summary.weak.join(', ') || 'No weak topics recorded'}
                        </p>
                      </div>
                      <button className="btn secondary" onClick={() => persist(s)}>
                        {s.stage === 'complete' ? 'Review' : 'Resume'}
                        <ArrowRight size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Delete session ${s.context.title || s.id}`}
                        onClick={() => deleteOne(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <History size={38} />
                <h2>Your first practice starts here.</h2>
                <p className="muted">Bring your source or try an example.</p>
                <button
                  className="btn primary"
                  onClick={() => void analyze(EXAMPLES[0].code, EXAMPLES[0].name)}
                >
                  Try Example
                </button>
              </div>
            )}
          </div>
        )}
        {view === 'privacy' && (
          <div className="content prose-page">
            <p className="eyebrow">LOCAL FIRST · FREE EDITION</p>
            <h1>Your code, your choice.</h1>
            <Privacy />
          </div>
        )}
        {view === 'how' && (
          <div className="content prose-page">
            <p className="eyebrow">SOURCE-GROUNDED PRACTICE</p>
            <h1>Make your logic speak.</h1>
            <section className="panel">
              <h2>1. Parse your own source</h2>
              <p>
                Paste or upload C++11 code. A bundled Tree-sitter parser identifies syntax locally.
                Repair reported syntax errors; syntax parsing does not establish semantic validity
                or runtime correctness.
              </p>
              <h2>2. Choose a focused interview</h2>
              <p>
                Pick Beginner, Normal TA, or Strict TA and 5, 10, or 15 questions. A seeded selector
                chooses distinct reviewed templates tied to constructs actually found in your
                source. Small programs may support fewer questions; the tool never pads with
                unrelated concepts.
              </p>
              <h2>3. Explain, then compare</h2>
              <p>
                Standard, Explain My Code, and Debugging Challenge use written answers. Read the
                reference, check the expected points, and mark your understanding. Written answers
                are never scored by keyword matching or AI.
              </p>
              <h2>4. Check objective answers separately</h2>
              <p>
                Quick Multiple Choice uses deterministic answer keys. These results stay separate
                from written self-assessments. One optional, source-supported follow-up is available
                for relevant templates.
              </p>
              <h2>5. Keep a study record</h2>
              <p>
                Resume on the same browser, retry weak questions, print to PDF, or export/import
                history. After a successful online load, cached assets aim to support offline use.
                No accounts, API credits, database, or paid runtime services are involved.
              </p>
              <button className="btn primary" onClick={() => navigate('editor')}>
                Start Practicing
                <ArrowRight size={16} />
              </button>
            </section>
          </div>
        )}
      </main>
      <footer className="footer no-print">
        <span>
          <Braces size={16} />
          CodeDefense<span className="muted">Know your code. Defend your logic.</span>
        </span>
        <div>
          <button onClick={() => navigate('privacy')}>Privacy &amp; local processing</button>
          <span>Free Edition · Independent of NTHU · No API keys</span>
        </div>
      </footer>
    </div>
  );
}
