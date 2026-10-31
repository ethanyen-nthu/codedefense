'use client';
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  highlight,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  highlight?: { start: number; end: number };
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  const initial = useRef(value);
  useEffect(() => {
    if (!host.current) return;
    const start = highlight?.start,
      end = highlight?.end;
    const marks = ViewPlugin.fromClass(
      class {
        decorations;
        constructor(v: EditorView) {
          const lines = [];
          if (start && end)
            for (let i = start; i <= Math.min(end, v.state.doc.lines); i++)
              lines.push(
                Decoration.line({ class: 'relevant-line' }).range(v.state.doc.line(i).from),
              );
          this.decorations = Decoration.set(lines);
        }
      },
      { decorations: (v) => v.decorations },
    );
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          basicSetup,
          cpp(),
          oneDark,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({
            'aria-label': readOnly ? 'Submitted C++ source' : 'C++ source editor',
            spellcheck: 'false',
          }),
          EditorView.lineWrapping,
          marks,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callback.current?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [readOnly, highlight?.start, highlight?.end]);
  useEffect(() => {
    initial.current = value;
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);
  return <div ref={host} className={`code-editor ${readOnly ? 'readonly' : ''}`} />;
}
