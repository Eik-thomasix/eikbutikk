import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {title: 'Tilbudsboden.no - Restpartier, kampanjevarer og gode kjøp | Eiksenteret Sortland',
description:
'Finn restpartier, kampanjevarer, utstillingsmodeller og ekstra gode kjøp fra Eiksenteret Sortland.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}