import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="content prose-page">
      <h1>This page is missing.</h1>
      <Link className="btn primary" href="/">
        Return to CodeDefense
      </Link>
    </main>
  );
}
