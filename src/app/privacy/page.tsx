import Link from 'next/link';
import { Privacy } from '@/components/privacy';
export default function PrivacyPage() {
  return (
    <main className="content prose-page">
      <p className="eyebrow">CODETA · LOCAL FIRST</p>
      <h1>Your code, your choice.</h1>
      <Privacy />
      <Link className="btn primary" href="/">
        Return to CodeTA
      </Link>
    </main>
  );
}
