'use client';
import dynamic from 'next/dynamic';
export const CodeEditor = dynamic(() => import('./code-editor').then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="editor-placeholder" role="status">
      Loading code editor…
    </div>
  ),
});
