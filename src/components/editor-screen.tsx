'use client';
import { useRef } from 'react';
import { ArrowRight, Upload, Trash2, Save, FileCode2 } from 'lucide-react';
import { CodeEditor } from './lazy-editor';
import { EXAMPLES } from '@/lib/examples';
import { readSourceFile } from '@/lib/source';
import { emptyContext, type AssignmentContext } from '@/lib/schemas';
export function EditorScreen({
  code,
  setCode,
  context,
  setContext,
  onAnalyze,
  onSave,
  busy,
  onError,
}: {
  code: string;
  setCode: (s: string) => void;
  context: AssignmentContext;
  setContext: (c: AssignmentContext) => void;
  onAnalyze: () => void;
  onSave: () => void;
  busy: boolean;
  onError: (s: string) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">01 / YOUR PROGRAM</p>
          <h1>Start with your code.</h1>
          <p className="muted">Paste or upload a C++ program. Nothing is sent to a server.</p>
        </div>
        <button className="btn secondary" disabled={!code.trim()} onClick={onSave}>
          <Save size={16} />
          Save program
        </button>
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
                <Upload size={15} />
                Upload
              </button>
              <button
                className="icon-btn"
                aria-label="Clear code"
                onClick={() => {
                  if (!code || confirm('Clear your current source draft?')) setCode('');
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <input
            ref={upload}
            type="file"
            hidden
            accept=".cpp,.txt"
            aria-label="Upload C++ source file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f)
                try {
                  setCode(await readSourceFile(f));
                } catch (error) {
                  onError(error instanceof Error ? error.message : 'Could not read file.');
                }
            }}
          />
          {!code && (
            <p className="editor-placeholder">
              Paste your C++ program below, or upload a .cpp file.
            </p>
          )}
          <CodeEditor value={code} onChange={setCode} />
          <div className="editor-status">
            <span>C++11 · UTF-8 · Tab moves focus</span>
            <span>{code.length.toLocaleString()} / 30,000 characters</span>
          </div>
          <p className="small muted editor-caption">.cpp / .txt · 120 KB maximum · 1,500 lines</p>
        </section>
        <aside className="panel context-panel">
          <p className="eyebrow">LAB NOTES · OPTIONAL</p>
          <h2>Give your practice a name.</h2>
          <label>
            Lab assignment title
            <input
              maxLength={150}
              value={context.title}
              placeholder="e.g. Digit sum"
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
          <details>
            <summary>Other personal notes</summary>
            <label>
              Topics taught in class
              <input
                value={context.topics}
                maxLength={1000}
                onChange={(e) => setContext({ ...context, topics: e.target.value })}
              />
            </label>
            <label>
              Teacher’s restrictions
              <input
                value={context.restrictions}
                maxLength={1000}
                onChange={(e) => setContext({ ...context, restrictions: e.target.value })}
              />
            </label>
          </details>
          <p className="small muted">
            Notes are saved with the report. Use explicit topic filters after analysis to exclude
            concepts; notes are not interpreted by an AI.
          </p>
        </aside>
      </div>
      <div className="analyze-bar panel">
        <div>
          <b>Understand the syntax. Explain the reasoning.</b>
          <p className="small muted">
            The bundled Tree-sitter parser reads syntax; it does not compile or execute your
            program.
          </p>
        </div>
        <button
          className="btn primary"
          disabled={busy || !code.trim() || code.length > 30000}
          onClick={onAnalyze}
        >
          Analyze Locally <ArrowRight size={17} />
        </button>
      </div>
      <section className="example-list">
        <h2>Try a beginner program</h2>
        <div className="actions">
          {EXAMPLES.map((e) => (
            <button
              className="btn secondary"
              key={e.name}
              onClick={() => {
                setCode(e.code);
                setContext({ ...emptyContext, title: e.name });
              }}
            >
              {e.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
