'use client';
import { LEVELS, levelOf } from '@/lib/difficulty';
import { kinds, type InterviewConfig, type Kind } from '@/lib/schemas';
export function PracticeConfig({
  config,
  onChange,
}: {
  config: InterviewConfig;
  onChange: (c: InterviewConfig) => void;
}) {
  const level = LEVELS[levelOf(config.difficulty) - 1];
  return (
    <>
      <label>
        Difficulty
        <select
          value={config.difficulty}
          onChange={(e) =>
            onChange({ ...config, difficulty: e.target.value as InterviewConfig['difficulty'] })
          }
        >
          {LEVELS.map((l, i) => (
            <option key={l.name} value={l.name}>
              Level {i + 1} · {l.name}
            </option>
          ))}
        </select>
      </label>
      <p className="small muted">{level.description}</p>
      <p className="level-example">
        <span className="eyebrow">EXAMPLE QUESTION</span>
        {level.example}
      </p>
      <div className="two-col">
        <label>
          Main questions
          <select
            value={config.count}
            onChange={(e) =>
              onChange({ ...config, count: Number(e.target.value) as InterviewConfig['count'] })
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
              onChange({ ...config, mode: e.target.value as InterviewConfig['mode'] })
            }
          >
            {[
              'Standard TA Interview',
              'Explain My Code',
              'Debugging Challenge',
              'Quick Multiple Choice',
              'What Happens If?',
              'Code Tracing',
              'TA Demo Mode',
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={config.adaptive}
          onChange={(e) => onChange({ ...config, adaptive: e.target.checked })}
        />
        Adaptive Practice
      </label>
      <p className="small muted">
        Opt in to automatic changes: a weak response or hint lowers the next level by one; three
        strong, hint-free responses raise it by one. Only unanswered questions change. Written
        signals are your self-assessments, not objective grades.
      </p>
      <details className="settings-details">
        <summary>Coursework filters & repeatable order</summary>
        <label className="check-row">
          <input
            type="checkbox"
            checked={config.preset}
            onChange={(e) => onChange({ ...config, preset: e.target.checked })}
          />
          NTHU beginner C++11 preset
        </label>
        <p className="small muted">
          Prioritizes input/output, conditions, loops, arrays, functions, recursion, and number
          processing. A study preset, not an official current syllabus. Choose concepts not yet
          taught below; they are excluded from question selection. General syntax still appears in
          your source.
        </p>
        <fieldset className="concept-filter">
          <legend>Concepts not yet taught</legend>
          {kinds.map((k) => (
            <label className="check-row" key={k}>
              <input
                type="checkbox"
                checked={config.excluded.includes(k)}
                onChange={(e) =>
                  onChange({
                    ...config,
                    excluded: e.target.checked
                      ? [...config.excluded, k]
                      : config.excluded.filter((c) => c !== (k as Kind)),
                  })
                }
              />
              {k}
            </label>
          ))}
        </fieldset>
        <label>
          Question-order seed (optional)
          <input
            value={config.seed}
            maxLength={80}
            onChange={(e) => onChange({ ...config, seed: e.target.value })}
          />
        </label>
      </details>
    </>
  );
}
