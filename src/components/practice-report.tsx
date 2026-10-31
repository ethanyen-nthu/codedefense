'use client';
import { ArrowLeft, Download, RotateCcw, Printer, Sparkles } from 'lucide-react';
import type { PracticeSession } from '@/lib/schemas';
import { summarize } from '@/lib/scoring';
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
  const report = summarize(session.records, session.total);
  const strongest = [...session.records]
    .filter((r) => !r.skipped)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 2);
  return (
    <div className="report content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE DEBRIEF</p>
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
        {session.demo
          ? 'Demo report · predefined questions and simulated keyword scores. '
          : 'AI-generated practice estimates. '}
        Scores and TA readiness are informal study indicators, never official NTHU grades.
      </div>
      <div className="report-top">
        <div className="panel score-panel">
          <div className="score-number">
            {report.overall}
            <span>/ 100</span>
          </div>
          <span className="badge violet">{report.readiness}</span>
          <p className="muted small">TA readiness · informal indicator</p>
        </div>
        <div className="panel report-stats">
          {[
            ['Completed', `${report.completed}/${session.total}`],
            ['Correct (8–10)', report.correct],
            ['Partial (4–<8)', report.partial],
            ['Incorrect (<4)', report.incorrect],
            ['Skipped', report.skipped],
          ].map(([label, value]) => (
            <div key={label}>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Build on your strengths</h2>
          <div className="chips">
            {report.strong.length ? (
              report.strong.map((c) => (
                <span className="badge green" key={c}>
                  {c}
                </span>
              ))
            ) : (
              <p className="muted">No consistently strong topics recorded yet.</p>
            )}
          </div>
          <h3>Strongest answers</h3>
          {strongest.length ? (
            strongest.map((r) => (
              <p key={r.question.id}>
                {r.question.text} <b className="accent">{r.finalScore}/10</b>
              </p>
            ))
          ) : (
            <p className="muted">Answer a question to see strengths here.</p>
          )}
        </section>
        <section className="panel">
          <h2>
            <Sparkles size={18} />
            Your next study session
          </h2>
          {report.weak.length ? (
            <ol>
              {report.weak.map((c) => (
                <li key={c}>
                  Review <b>{c}</b>: trace the cited lines with a normal input and one boundary
                  input, then explain the reasoning aloud.
                </li>
              ))}
            </ol>
          ) : (
            <p>
              Explain one solution without looking at the notes, then test your reasoning with a new
              boundary input.
            </p>
          )}
          <p className="muted small">
            Overall = sum of final main-question scores ÷ ({session.total} × 10) × 100. Skips count
            as 0. With a follow-up, final = mean of initial and follow-up scores; both are retained.
          </p>
        </section>
      </div>
      <div className="actions no-print">
        <button className="btn primary" onClick={onRetry} disabled={!report.weak.length}>
          <RotateCcw size={16} />
          Retry Incorrect Questions
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
          onClick={() => downloadJson(session, `codedefense-report-${session.id}.json`)}
        >
          <Download size={16} />
          Download Practice Report
        </button>
      </div>
      <h2 className="section-title">Question by question</h2>
      {session.records.map((r, i) => (
        <article className="panel answer-review" key={r.question.id}>
          <div className="row between">
            <span className="eyebrow">
              QUESTION {i + 1} · {r.question.concept}
            </span>
            <span className="badge">{r.skipped ? 'Skipped' : `${r.finalScore}/10`}</span>
          </div>
          <h3>{r.question.text}</h3>
          <p className="muted small">
            Source lines {r.question.evidence.start}–{r.question.evidence.end}
          </p>
          <pre>{r.question.evidence.snippet}</pre>
          <h4>Your answer</h4>
          <p className="preserve">{r.answer || 'Skipped'}</p>
          <h4>Expected key points</h4>
          <ul>
            {r.feedback.expected.map((p, j) => (
              <li key={j}>{p}</li>
            ))}
          </ul>
          <h4>Evaluation · initial {r.initialScore}/10</h4>
          <p>{r.feedback.explanation}</p>
          {r.feedback.missing.length > 0 && (
            <>
              <h4>Most important gaps</h4>
              <ul>
                {r.feedback.missing.map((m, j) => (
                  <li key={j}>{m}</li>
                ))}
              </ul>
            </>
          )}
          <p className="muted small">Rubric: {r.feedback.rubric}</p>
          <h4>Example correct answer</h4>
          <p>{r.feedback.modelAnswer}</p>
          {r.followUp && (
            <div className="followup-review">
              <h4>
                Follow-up · {r.followUp.skipped ? 'Skipped' : `${r.followUp.feedback.score}/10`}
              </h4>
              <p>{r.followUp.question.text}</p>
              <p className="preserve">Your answer: {r.followUp.answer}</p>
              <p>{r.followUp.feedback.explanation}</p>
              <p>Example: {r.followUp.feedback.modelAnswer}</p>
              <p className="muted small">
                {r.followUp.skipped
                  ? `Initial score retained: ${r.finalScore}/10`
                  : `Final: (${r.initialScore} + ${r.followUp.feedback.score}) ÷ 2 = ${r.finalScore}/10`}
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
