'use client';
import { useRef } from 'react';
import { ArrowRight, Download, FolderInput, Trash2 } from 'lucide-react';
import type { PracticeSession, Kind } from '@/lib/schemas';
import { weakTopics, summarize } from '@/lib/engine';
import { downloadJson, exportHistory, type SavedProgram } from '@/lib/storage';
export function HistoryScreen({
  history,
  onResume,
  onDelete,
  onClear,
  onImport,
  legacy,
  onDeleteLegacy,
}: {
  history: PracticeSession[];
  onResume: (s: PracticeSession) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onImport: (file: File) => void;
  legacy: unknown[];
  onDeleteLegacy: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PRACTICE LOG</p>
          <h1>Keep the reasoning.</h1>
          <p className="muted">Up to 15 recent sessions in this browser.</p>
        </div>
      </div>
      <div className="notice">
        <b>Moving from CodeDefense?</b> Open{' '}
        <a href="https://codedefense-free.pages.dev/#history" target="_blank" rel="noreferrer">
          the previous site’s History
        </a>
        , choose Export History, then Import History here. Browser data cannot move between
        hostnames automatically. Original records are preserved.
      </div>
      <div className="actions history-actions">
        <button
          className="btn secondary"
          onClick={() => downloadJson(exportHistory(), 'codeta-history.json')}
        >
          <Download size={16} />
          Export History
        </button>
        <button className="btn secondary" onClick={() => file.current?.click()}>
          <FolderInput size={16} />
          Import History
        </button>
        <button className="btn ghost danger-text" disabled={!history.length} onClick={onClear}>
          <Trash2 size={16} />
          Clear All History
        </button>
      </div>
      <p className="small muted">
        Exports include saved programs and source. Import accepts CodeTA v3 and CodeDefense Free v2
        exports. Save your backup somewhere private.
      </p>
      <input
        type="file"
        accept=".json"
        hidden
        ref={file}
        aria-label="Import history file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onImport(f);
        }}
      />
      {history.length ? (
        <div className="history-list">
          {history.map((s) => {
            const r = summarize(s);
            return (
              <article className="panel history-card" key={s.id}>
                <div className="history-details">
                  <h2>{s.context.title || 'Untitled C++ practice'}</h2>
                  <p className="small muted">
                    {new Date(s.createdAt).toLocaleString()} ·{' '}
                    {s.stage === 'complete' ? 'Complete' : 'In progress'} · {s.config.difficulty}
                  </p>
                  <p className="small">
                    {r.autoScore === null
                      ? `${r.complete} understood / ${r.partial} partial / ${r.notYet} need practice (self-assessed)`
                      : `MC: ${r.autoCorrect}/${r.autoTotal} correct`}{' '}
                    · {r.hints} hints
                  </p>
                </div>
                <button className="btn secondary" onClick={() => onResume(s)}>
                  {s.stage === 'complete' ? 'Review' : 'Resume'}
                  <ArrowRight size={15} />
                </button>
                <button
                  className="icon-btn danger-text"
                  aria-label={`Delete session ${s.context.title || s.id}`}
                  onClick={() => onDelete(s.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No sessions yet.</h2>
          <p>Your completed and in-progress interviews will appear here.</p>
        </div>
      )}
      {legacy.length > 0 && (
        <section className="panel">
          <h2>Earlier paid-version records</h2>
          <p>Kept separately; earlier AI/demo scores never become CodeTA grades.</p>
          <div className="actions">
            <button
              className="btn secondary"
              onClick={() => downloadJson(legacy, 'codedefense-legacy-history.json')}
            >
              Export Legacy History
            </button>
            <button className="btn ghost" onClick={onDeleteLegacy}>
              Delete Legacy History
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
export function LearningScreen({
  history,
  onPractice,
}: {
  history: PracticeSession[];
  onPractice: (s: PracticeSession, kind: Kind) => void;
}) {
  const rows = weakTopics(history);
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WEAK TOPIC REVIEW</p>
          <h1>Make the next session count.</h1>
          <p className="muted">
            Hints, skipped questions, incorrect choices, and self-assessed gaps guide this review.
          </p>
        </div>
      </div>
      <p className="notice">
        Written signals reflect your own understanding, not a semantic grade. One-click practice
        uses a recent program containing that concept and starts with related beginner questions.
        Small pools produce shorter sessions.
      </p>
      {rows.length ? (
        <div className="topic-grid">
          {rows.map((row) => (
            <article className="panel" key={row.concept}>
              <div className="row between">
                <h2>{row.concept}</h2>
                <span className="badge">{row.weak ? 'Review' : 'Practiced'}</span>
              </div>
              <p>
                {row.attempts} practiced · {row.weak} review signals · {row.hints} hints
              </p>
              <p className="small muted">
                {row.weak > 1
                  ? 'Repeated review signals: start with the basic rule, then explain the cited source.'
                  : row.weak
                    ? 'Compare the rule with the exact code before trying another boundary.'
                    : 'Try explaining a boundary case or choosing a harder level.'}
              </p>
              <button
                className="btn secondary"
                onClick={() => onPractice(row.session, row.concept)}
              >
                Practice {row.concept}
                <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>A little practice gives you a starting point.</h2>
          <p>Answer a few questions, then return to review concepts here.</p>
        </div>
      )}
    </div>
  );
}
export function ProgramsScreen({
  programs,
  onLoad,
  onDelete,
}: {
  programs: SavedProgram[];
  onLoad: (p: SavedProgram) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SAVED PROGRAMS</p>
          <h1>Your small code library.</h1>
          <p className="muted">
            Up to 20 programs, stored locally. Save from the editor; export from History for a
            backup.
          </p>
        </div>
      </div>
      {programs.length ? (
        <div className="history-list">
          {programs.map((p) => (
            <article className="panel history-card" key={p.id}>
              <div className="history-details">
                <h2>{p.name}</h2>
                <p className="small muted">
                  {p.code.split('\n').length} lines · Saved {new Date(p.updatedAt).toLocaleString()}
                </p>
              </div>
              <button className="btn secondary" onClick={() => onLoad(p)}>
                Open program
                <ArrowRight size={15} />
              </button>
              <button
                className="icon-btn danger-text"
                aria-label={`Delete program ${p.name}`}
                onClick={() => onDelete(p.id)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No saved programs yet.</h2>
          <p>Paste or upload a program, give it a name, and select Save program in the editor.</p>
        </div>
      )}
    </div>
  );
}
