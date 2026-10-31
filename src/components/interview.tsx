'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, SkipForward } from 'lucide-react';
import { CodeEditor } from './lazy-editor';
import { LEVELS } from '@/lib/difficulty';
import { assess, advance, submit, followUp, canAdvance, changeDifficulty } from '@/lib/engine';
import type { PracticeSession, Difficulty, Assessment } from '@/lib/schemas';
const ASSESSMENTS: [Assessment, string][] = [
  ['complete', 'Understood completely / 完全理解'],
  ['partial', 'Partially understood / 部分理解'],
  ['not-yet', 'Need more practice / 需要練習'],
];
export function Interview({
  session: s,
  onChange,
  onDraft,
  onBack,
}: {
  session: PracticeSession;
  onChange: (work: () => PracticeSession) => void;
  onDraft: (patch: Partial<PracticeSession>) => void;
  onBack: () => void;
}) {
  const [mobileCode, setMobileCode] = useState(false),
    [picked, setPicked] = useState<Difficulty | null>(null),
    [focused, setFocused] = useState(s.config.mode === 'TA Demo Mode');
  const title = useRef<HTMLHeadingElement>(null);
  const q = s.questions[s.index],
    r = s.records.at(-1),
    isFollow = s.stage === 'followup' || s.stage === 'followup-feedback',
    feedback = s.stage === 'feedback' || s.stage === 'followup-feedback',
    mc = s.config.mode === 'Quick Multiple Choice' && !isFollow;
  const skipped = isFollow ? r?.followUp?.skipped : r?.skipped,
    selected = isFollow ? r?.followUp?.assessment : r?.assessment;
  const reference = isFollow ? q.followUp?.explanation : q.explanation,
    expected = isFollow ? q.followUp?.expected : q.expected;
  useEffect(() => {
    if (s.stage === 'question') {
      title.current?.focus({ preventScroll: true });
      title.current?.scrollIntoView({
        block: 'nearest',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }, [q.id, s.stage]);
  return (
    <div className={`content interview-page ${focused ? 'focused' : ''}`}>
      <div className="interview-heading">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} />
          Workspace
        </button>
        <div className="row">
          <span className="badge">{s.config.difficulty}</span>
          <button
            className="text-button"
            aria-pressed={focused}
            onClick={() => setFocused(!focused)}
          >
            {focused ? 'Exit focused mode' : 'Focus mode'}
          </button>
        </div>
      </div>
      <div className="interview-progress">
        <div className="row between">
          <span>
            Question {s.index + 1} of {s.questions.length}
          </span>
          <span>{s.records.length} main responses recorded</span>
        </div>
        <progress
          aria-label="Interview progress"
          max={s.questions.length}
          value={s.records.length}
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
        <aside className={`panel source-panel ${mobileCode ? 'mobile-visible' : ''}`}>
          <div className="editor-toolbar">
            <span>Submitted source</span>
            <span className="badge">C++11 · Read only</span>
          </div>
          <CodeEditor value={s.code} readOnly highlight={q.evidence} />
          <p className="small muted editor-caption">
            Lines {q.evidence.start}–{q.evidence.end} · Parsed, not executed
          </p>
        </aside>
        <section
          className={`panel question-panel ${!mobileCode ? 'mobile-visible' : ''}`}
          aria-label="Current interview question"
          key={`${q.id}:${isFollow}`}
        >
          <div className="row between">
            <p className="eyebrow">
              {isFollow ? 'TA FOLLOW-UP' : q.format} · {q.concept}
            </p>
            <span className="badge">{q.grounding}</span>
          </div>
          <h1 className="question-title" ref={title} tabIndex={-1}>
            {isFollow ? q.followUp?.text : q.text}
          </h1>
          <p className="small muted">
            Source lines {q.evidence.start}–{q.evidence.end} ·{' '}
            {mc ? 'Exact answer key' : 'Written · self-assessment'}
          </p>
          {!feedback ? (
            <>
              <div className="answer-workspace">
                {mc ? (
                  <fieldset className="choice-list">
                    <legend>Choose one answer</legend>
                    {q.choices.map((choice, i) => (
                      <label className={`choice ${s.draftChoice === i ? 'selected' : ''}`} key={i}>
                        <input
                          type="radio"
                          name="answer-choice"
                          value={i}
                          checked={s.draftChoice === i}
                          onChange={() => onDraft({ draftChoice: i })}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <label className="answer-label">
                    Your answer <span className="small muted">English or 繁體中文</span>
                    <textarea
                      rows={6}
                      maxLength={4000}
                      value={s.draft}
                      placeholder="Explain the reasoning, not just the syntax…"
                      onChange={(e) => onDraft({ draft: e.target.value })}
                    />
                  </label>
                )}
                <p className="small muted">
                  {mc
                    ? 'Your choice is checked against the reviewed key.'
                    : 'Your explanation is not automatically graded. Compare it with the reference after submitting.'}
                </p>
              </div>
              {s.hint && (
                <div className="notice" role="status">
                  {q.hint}
                </div>
              )}
              <div className="question-actions actions">
                <button
                  className="btn primary"
                  disabled={mc ? s.draftChoice === null : !s.draft.trim()}
                  onClick={() => onChange(() => submit(s))}
                >
                  {mc ? 'Check Answer' : 'Compare My Answer'}
                  <ArrowRight size={17} />
                </button>
                <button
                  className="btn ghost"
                  disabled={s.hint}
                  onClick={() => onChange(() => ({ ...s, hint: true }))}
                >
                  <Lightbulb size={16} />
                  Hint
                </button>
                <button className="btn ghost" onClick={() => onChange(() => submit(s, true))}>
                  <SkipForward size={16} />
                  Skip
                </button>
              </div>
            </>
          ) : (
            <div className="feedback-panel">
              <div className="feedback-heading">
                <h2>
                  {skipped
                    ? 'Skipped'
                    : mc
                      ? r?.correct
                        ? 'Correct'
                        : 'Review this concept'
                      : 'Compare & reflect'}
                </h2>
                <span className="badge">
                  {mc ? 'Automatically checked' : 'Not automatically graded'}
                </span>
              </div>
              {!mc && !skipped && (
                <details>
                  <summary>Review your response</summary>
                  <p className="preserve">{isFollow ? r?.followUp?.answer : r?.answer}</p>
                </details>
              )}
              <h3>Reference explanation</h3>
              <p className="model-answer">{reference}</p>
              <h3>Expected points to check</h3>
              <ul>
                {expected?.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <details className="simple-explanation">
                <summary>Explain More Simply</summary>
                <p>{isFollow ? q.followUp?.explanation : q.simple || q.explanation}</p>
                <p className="small muted">Prewritten study explanation. No AI service is used.</p>
              </details>
              {mc && (
                <details>
                  <summary>Why each choice is right or wrong</summary>
                  {q.choices.map((choice, i) => (
                    <div className="choice-review" key={i}>
                      <b>
                        {i === q.correctIndex ? 'Correct' : 'Incorrect'}
                        {r?.choice === i ? ' · Your choice' : ''}
                      </b>
                      <p>{choice}</p>
                      <p className="muted">{q.choiceExplanations?.[i] || q.explanation}</p>
                    </div>
                  ))}
                </details>
              )}
              {!mc && !skipped && (
                <fieldset className="assessment-list">
                  <legend>Your self-assessment</legend>
                  {ASSESSMENTS.map(([value, label]) => (
                    <button
                      className={`btn ${selected === value ? 'primary' : 'secondary'}`}
                      aria-pressed={selected === value}
                      key={value}
                      onClick={() => onChange(() => assess(s, value))}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              )}
              <div className="actions">
                <button
                  className="btn primary"
                  disabled={!canAdvance(s)}
                  onClick={() => onChange(() => advance(s))}
                >
                  {s.index + 1 === s.questions.length ? 'View Practice Report' : 'Next Question'}
                  <ArrowRight size={17} />
                </button>
                {!isFollow && q.followUp && !r?.followUp && (
                  <button
                    className="btn secondary"
                    disabled={!canAdvance(s)}
                    onClick={() => onChange(() => followUp(s))}
                  >
                    Practice one follow-up
                  </button>
                )}
              </div>
              {!isFollow && s.index + 1 < s.questions.length && (
                <details className="difficulty-change">
                  <summary>Change remaining difficulty</summary>
                  <p className="small muted">
                    Answered questions and results stay unchanged. Unanswered questions may be fewer
                    if the reviewed pool is small.
                  </p>
                  <label>
                    New difficulty
                    <select
                      value={picked || s.config.difficulty}
                      onChange={(e) => setPicked(e.target.value as Difficulty)}
                    >
                      {LEVELS.map((l) => (
                        <option key={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn secondary"
                    disabled={!picked || picked === s.config.difficulty}
                    onClick={() => onChange(() => changeDifficulty(s, picked!))}
                  >
                    Apply to remaining questions
                  </button>
                </details>
              )}
            </div>
          )}
          <div className="session-save">Saved on this browser · source and answers stay local</div>
        </section>
      </div>
    </div>
  );
}
