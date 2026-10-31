'use client';
import {
  ArrowUpRight,
  ArrowRight,
  Code2,
  MessageSquare,
  ShieldCheck,
  Terminal,
  Check,
  Braces,
  CornerDownRight,
} from 'lucide-react';
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
    <div className="home">
      <div className="hero-grid">
        <section className="hero-copy">
          <div className="hero-pill">
            <span className="live-dot" />
            YOUR NEXT LAB DEMO STARTS HERE
          </div>
          <h1>
            Know your code.
            <br />
            <span>Defend your logic.</span>
          </h1>
          <p className="hero-description">
            You wrote the program. Now make the reasoning yours. Practice a C++ oral exam with an AI
            teaching assistant that asks about <em>your actual code.</em>
          </p>
          <div className="actions">
            <button className="btn primary large" onClick={onStart}>
              Start Practicing
              <ArrowUpRight size={19} />
            </button>
            <button className="btn secondary large" onClick={onDemo}>
              <Terminal size={18} />
              Try Demo
            </button>
          </div>
          <div className="hero-assurances">
            <span>
              <Check size={14} />
              No account needed
            </span>
            <span>
              <Check size={14} />
              No installation
            </span>
            <span>
              <Check size={14} />
              English / 繁體中文
            </span>
          </div>
          <div className="student-note">
            <span className="mini-logo">
              <Braces size={19} />
            </span>
            <div>
              Built for the moment after “show me your code.”
              <br />
              <span className="muted">For intro C++ students. Independent of NTHU.</span>
            </div>
          </div>
        </section>
        <section className="hero-preview" aria-label="Predefined demo interview preview">
          <div className="preview-top">
            <div className="window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>digit_sum.cpp</span>
            <span className="badge">DEMO PREVIEW</span>
          </div>
          <div className="preview-code">
            <div className="preview-line">
              <span>05</span>
              <code>
                <b>int</b> number;
              </code>
            </div>
            <div className="preview-line">
              <span>06</span>
              <code>cin &gt;&gt; number;</code>
            </div>
            <div className="preview-line">
              <span>07</span>
              <code>
                <b>int</b> temp = number;
              </code>
            </div>
            <div className="preview-line">
              <span>08</span>
              <code>
                <b>int</b> sum = <i>0</i>;
              </code>
            </div>
            <div className="preview-line">
              <span>09</span>
              <code>
                <b>while</b> (temp &gt; <i>0</i>) {'{'}
              </code>
            </div>
            <div className="preview-line highlighted">
              <span>10</span>
              <code>
                {' '}
                sum += temp % <i>10</i>;
              </code>
              <span className="line-focus">← let’s talk about this</span>
            </div>
            <div className="preview-line">
              <span>11</span>
              <code>
                {' '}
                temp /= <i>10</i>;
              </code>
            </div>
            <div className="preview-line">
              <span>12</span>
              <code>{'}'}</code>
            </div>
          </div>
          <div className="preview-interview">
            <div className="row">
              <span className="ta-avatar">TA</span>
              <div>
                <b>Your practice TA</b>
                <p className="small muted">QUESTION 01 · INTEGER OPERATIONS</p>
              </div>
              <span className="pulse-label">Your turn</span>
            </div>
            <h3>
              Why does <code>temp % 10</code> give you the last digit?
            </h3>
            <p className="muted">Walk me through your reasoning.</p>
            <div className="preview-response">
              <CornerDownRight size={16} />
              <span>Because the remainder after division by 10...</span>
              <span className="cursor" />
            </div>
            <div className="preview-footer">
              <span>
                <span className="live-dot" />
                One question at a time
              </span>
              <span>
                Source-aware practice
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        </section>
      </div>
      <div className="home-divider">
        <span>LESS MEMORIZING. MORE UNDERSTANDING.</span>
        <button className="text-button" onClick={onHow}>
          How it works
          <ArrowRight size={15} />
        </button>
      </div>
      <div className="feature-grid">
        {[
          {
            n: '01',
            Icon: Code2,
            title: 'Bring your own code',
            text: 'Paste or upload C++. Add your lab requirements for a more relevant interview.',
          },
          {
            n: '02',
            Icon: MessageSquare,
            title: 'Think out loud',
            text: 'Answer code-specific questions, get hints, and work through one adaptive follow-up.',
          },
          {
            n: '03',
            Icon: ShieldCheck,
            title: 'Leave with a plan',
            text: 'Review explanations, practice scores, and the concepts to focus on next.',
          },
        ].map(({ n, Icon, title, text }) => (
          <article className="feature" key={n}>
            <div className="row between">
              <Icon size={23} />
              <span>{n}</span>
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="privacy-strip">
        <ShieldCheck size={17} />
        <p>
          You choose when code is sent to OpenAI. History stays in your browser. Live session state
          expires after 24 hours. Code is never executed.
        </p>
      </div>
    </div>
  );
}
