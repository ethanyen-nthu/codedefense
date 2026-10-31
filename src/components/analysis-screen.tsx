'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Analysis, InterviewConfig } from '@/lib/schemas';
import { generateQuestions } from '@/lib/engine';
import { levelOf } from '@/lib/difficulty';
import { PracticeConfig } from './practice-config';
export function AnalysisScreen({
  analysis,
  config,
  onConfig,
  onEdit,
  onBegin,
  busy,
}: {
  analysis: Analysis;
  config: InterviewConfig;
  onConfig: (c: InterviewConfig) => void;
  onEdit: () => void;
  onBegin: () => void;
  busy: boolean;
}) {
  const pool = analysis.diagnostics.length
    ? []
    : generateQuestions(analysis, { ...config, seed: config.seed || 'preview' });
  const matching = pool.filter((q) => q.level === levelOf(config.difficulty)).length;
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">02 / KNOW THE TERRAIN</p>
          <h1>Here’s what your code supports.</h1>
          <p className="muted">Parsed locally with Tree-sitter C++.</p>
        </div>
        <button className="btn secondary" onClick={onEdit}>
          <ArrowLeft size={16} />
          Edit code
        </button>
      </div>
      <div className="analysis-grid">
        <section className="panel">
          <h2>Code Understanding Report</h2>
          <p>{analysis.summary}</p>
          {analysis.diagnostics.length > 0 && (
            <div className="notice warning">
              <h3>Repair syntax before practicing</h3>
              {analysis.diagnostics.map((d, i) => (
                <p key={i}>
                  Line {d.line}, column {d.column}: {d.message}
                </p>
              ))}
            </div>
          )}
          <h3>Detected constructs</h3>
          <div className="chips">
            {[...new Set(analysis.constructs.map((c) => c.kind))].map((k) => (
              <span className="badge" key={k}>
                {k}
              </span>
            ))}
          </div>
          <div className="evidence-list">
            {[...new Set(analysis.constructs.map((c) => c.kind))].map((kind) => (
              <details key={kind}>
                <summary>
                  {kind}{' '}
                  <span className="muted">
                    {analysis.constructs.filter((c) => c.kind === kind).length} occurrence(s)
                  </span>
                </summary>
                {analysis.constructs
                  .filter((c) => c.kind === kind)
                  .slice(0, 8)
                  .map((c, i) => (
                    <div key={i}>
                      <p className="small muted">
                        Lines {c.evidence.start}–{c.evidence.end}
                        {c.features?.condition ? ` · condition: ${c.features.condition}` : ''}
                      </p>
                      <pre>{c.evidence.snippet}</pre>
                    </div>
                  ))}
              </details>
            ))}
          </div>
          <details>
            <summary>Analysis boundaries</summary>
            <ul>
              {analysis.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>
        </section>
        <section className="panel interview-config">
          <p className="eyebrow">03 / YOUR INTERVIEW</p>
          <h2>Choose your challenge.</h2>
          <PracticeConfig config={config} onChange={onConfig} />
          <p className="notice small">
            {pool.length} supported question{pool.length === 1 ? '' : 's'} available for this
            selection.
            {pool.length < config.count
              ? ' Your program and filters support a smaller interview; unrelated questions are never added.'
              : ''}
            {levelOf(config.difficulty) >= 4 && matching < Math.min(3, config.count)
              ? ' This source offers limited material at the selected level. Related foundation questions may be included.'
              : ''}
          </p>
          <button
            className="btn primary full"
            disabled={busy || !pool.length || Boolean(analysis.diagnostics.length)}
            onClick={onBegin}
          >
            Begin Interview <ArrowRight size={17} />
          </button>
          <p className="small muted">
            Written answers are self-assessed. Multiple choice uses exact answer keys. One optional
            follow-up per main question.
          </p>
        </section>
      </div>
    </div>
  );
}
