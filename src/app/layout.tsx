import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'CodeDefense · Know your code. Defend your logic.',
  description:
    'Practice explaining your own C++ code with a local C++ parser and reviewed question templates. Source-grounded questions, supportive feedback, and browser-local study history.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
