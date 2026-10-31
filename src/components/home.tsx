'use client';
import { ArrowRight, Code2, MessageSquare, ChartNoAxesCombined, ShieldCheck } from 'lucide-react';
export function Home({
  onStart,
  onDemo,
  onHow,
}: {
  onStart: () => void;
  onDemo: () => void;
  onHow: () => void;
}) {
  return (
    <div className="home content">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">YOUR CODE. YOUR REASONING.</p>
          <h1>
            Understand your code.
            <br />
            <span>Ace your TA demo.</span>
          </h1>
          <p className="hero-description">
            Practice explaining your C++ programs with code-specific questions, realistic TA
            challenges, and instant learning feedback.
          </p>
          <div className="actions">
            <button className="btn primary" onClick={onStart}>
              Start Practicing <ArrowRight size={17} />
            </button>
            <button className="btn secondary" onClick={onDemo}>
              Try an Example
            </button>
          </div>
          <p className="small muted">C++11 · No account · No API keys · Works locally</p>
        </div>
        <section className="hero-preview" aria-label="Verified example interview preview">
          <div className="editor-toolbar">
            <span>
              <Code2 size={16} />
              digit_sum.cpp
            </span>
            <span className="badge">Example preview</span>
          </div>
          <pre className="preview-code">
            <span className="muted">01</span> int sum = 0;{'\n'}
            <span className="muted">02</span> while (number &gt; 0) {'{'}
            {'\n'}
            <span className="preview-highlight">
              <span className="muted">03</span> sum += number % 10;
            </span>
            {'\n'}
            <span className="muted">04</span> number /= 10;{'\n'}
            <span className="muted">05</span> {'}'}
          </pre>
          <div className="preview-interview">
            <div className="row between">
              <span className="eyebrow">TA QUESTION · LINE 3</span>
              <span className="badge">Your source</span>
            </div>
            <h2>
              For a nonnegative integer, why does <code>number % 10</code> isolate the last digit?
            </h2>
            <p className="muted">
              Explain your reasoning, then compare it with a reviewed reference.
            </p>
            <button className="text-button" onClick={onDemo}>
              Practice with a real example <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </section>
      <div className="section-heading">
        <h2>A better way to prepare</h2>
        <button className="text-button" onClick={onHow}>
          How it works <ArrowRight size={15} />
        </button>
      </div>
      <section className="feature-grid">
        {[
          {
            Icon: Code2,
            title: 'Paste your C++ code.',
            text: 'Use your own program or a built-in example. Syntax analysis stays in your browser.',
          },
          {
            Icon: MessageSquare,
            title: 'Practice real TA-style questions.',
            text: 'Choose from five levels. Explain decisions, check boundaries, and try focused follow-ups.',
          },
          {
            Icon: ChartNoAxesCombined,
            title: 'Review your weak areas.',
            text: 'Compare references and keep MC results separate from your own understanding.',
          },
        ].map(({ Icon, title, text }, i) => (
          <article className="feature" key={title}>
            <span className="step-number">0{i + 1}</span>
            <Icon size={21} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <div className="privacy-strip">
        <ShieldCheck size={18} />
        <p>
          No code uploads to a server. No execution of arbitrary C++. Saved programs, reports, and
          offline assets stay on your device.
        </p>
      </div>
    </div>
  );
}
