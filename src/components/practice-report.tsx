'use client';
import { ArrowLeft, Download, RotateCcw, Printer } from 'lucide-react';
import type { PracticeSession } from '@/lib/schemas';
import { summarize } from '@/lib/engine';
import { downloadJson } from '@/lib/storage';
export function PracticeReport({
  session,
  onRetry,
  onNew,
  onEditor,
}: {
  session: PracticeSession;
  onRetry: () => void;
  onNew: () => void;
  onEditor: () => void;
}) {
  const s = summarize(session);
  return (
    <div className="report content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE DEBRIEF · FREE EDITION</p>
          <h1>Your code. Better understood.</h1>
          <p className="muted">
            {session.context.title || 'C++ practice'} ·{' '}
            {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button className="btn secondary no-print" onClick={onEditor}>
          <ArrowLeft size={16} />
          Return to Editor
        </button>
      </div>
      <div className="notice">
        Automatic multiple-choice results and written-answer self-assessments are reported
        separately. These are informal study records, not official grades. Your code was parsed
        locally, never compiled or executed.
      </div>
      <div className="two-col">
        <section className="panel score-panel">
          <h2>Automatically graded</h2>
          <div className="score-number">
            {s.autoScore === null ? '—' : s.autoScore}
            <span>{s.autoScore === null ? 'No MC answers' : '/ 100'}</span>
          </div>
          <p>
            {s.autoCorrect} correct / {s.autoTotal} recorded multiple-choice questions
          </p>
          <p className="muted small">
            Exact answer-key comparison. Skipped MC questions count as incorrect. Written answers
            never contribute to this score.
          </p>
        </section>
        <section className="panel">
          <h2>Written self-assessment</h2>
          <div className="report-stats">
            {[
              ['Understood', s.complete],
              ['Partially', s.partial],
              ['Not yet', s.notYet],
              ['Unassessed', s.unassessed],
            ].map(([label, n]) => (
              <div key={label}>
                <b>{n}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="muted small">
            Chosen by you after reviewing the reference. This is not an objective correctness grade.
          </p>
        </section>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Concepts practiced</h2>
          <p>
            {s.completed} answered / {session.questions.length} main questions · {s.skipped} skipped
          </p>
          <div className="chips">
            {s.concepts.map((c) => (
              <span className="badge" key={c}>
                {c}
              </span>
            ))}
          </div>
          <p className="small muted">Saved question-order seed: {session.config.seed}</p>
        </section>
        <section className="panel">
          <h2>Your next study session</h2>
          {s.weak.length ? (
            <ul>
              {s.weak.map((c) => (
                <li key={c}>
                  Review <b>{c}</b>. Explain the cited statement, check its assumptions, and compare
                  with the reference checklist.
                </li>
              ))}
            </ul>
          ) : (
            <p>Choose a different program and explain one boundary case aloud.</p>
          )}
          <p className="muted small">
            Weak topics come from incorrect/skipped MC answers or your written/follow-up
            self-assessments.
          </p>
        </section>
      </div>
      <div className="actions no-print">
        <button className="btn primary" disabled={!s.weak.length} onClick={onRetry}>
          <RotateCcw size={16} />
          Retry Weak Questions
        </button>
        <button className="btn secondary" onClick={onNew}>
          New Interview
        </button>
        <button className="btn secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save PDF
        </button>
        <button
          className="btn ghost"
          onClick={() =>
            downloadJson(
              { format: 'codedefense-free', version: 2, sessions: [session] },
              'codedefense-practice-report.json',
            )
          }
        >
          <Download size={16} />
          Download Study Report
        </button>
      </div>
      <h2 className="section-title">Question by question</h2>
      {session.records.map((r, i) => (
        <article className="panel answer-review" key={r.question.id}>
          <div className="row between">
            <span className="eyebrow">
              QUESTION {i + 1} · {r.question.concept}
            </span>
            <span className="badge">
              {r.skipped
                ? 'Skipped'
                : r.correct === null
                  ? `Self-assessed: ${r.assessment || 'unassessed'}`
                  : r.choice === r.question.correctIndex
                    ? 'MC: correct'
                    : 'MC: incorrect'}
            </span>
          </div>
          <h3>{r.question.text}</h3>
          <p className="muted small">
            Source lines {r.question.evidence.start}–{r.question.evidence.end}
          </p>
          <pre>{r.question.evidence.snippet}</pre>
          <h4>Your response</h4>
          <p className="preserve">
            {r.skipped ? 'Skipped' : r.correct === null ? r.answer : r.question.choices[r.choice!]}
          </p>
          <h4>Reference explanation</h4>
          <p>{r.question.explanation}</p>
          <h4>Expected points to check</h4>
          <ul>
            {r.question.expected.map((p, j) => (
              <li key={j}>{p}</li>
            ))}
          </ul>
          {r.followUp && (
            <div className="followup-review">
              <h4>
                Follow-up ·{' '}
                {r.followUp.skipped
                  ? 'Skipped'
                  : `Self-assessed: ${r.followUp.assessment || 'unassessed'}`}
              </h4>
              <p>{r.question.followUp?.text}</p>
              <p className="preserve">{r.followUp.answer || 'Skipped'}</p>
              <p>{r.question.followUp?.explanation}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
