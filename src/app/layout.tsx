import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'CodeTA · Understand your code. Ace your TA demo.',
  description:
    'Practice explaining your C++ programs with code-specific questions, realistic TA challenges, and instant learning feedback.',
  metadataBase: new URL('https://codeta.pages.dev'),
  openGraph: {
    title: 'CodeTA · Understand your code. Ace your TA demo.',
    description: 'Local C++11 oral-exam practice. Made by Ethan Yen for NTHU programming classes.',
    type: 'website',
    images: ['/opengraph.svg'],
  },
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem('codeta-theme')||'system';if(!['light','dark','system'].includes(p))p='system';document.documentElement.dataset.preference=p;document.documentElement.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
