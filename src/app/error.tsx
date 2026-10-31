'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="content prose-page">
      <h1>Let’s try that again.</h1>
      <p>The workspace could not render. Your saved browser history may still be available.</p>
      <button className="btn primary" onClick={reset}>
        Retry workspace
      </button>
    </main>
  );
}
