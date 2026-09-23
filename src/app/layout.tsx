import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tilbudsboden.no'),
  title:
    'Tilbudsboden.no - Restpartier, kampanjevarer og gode kjøp | Eiksenteret Sortland',
  description:
    'Finn restpartier, kampanjevarer, utstillingsmodeller og ekstra gode kjøp fra Eiksenteret Sortland.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: 'https://tilbudsboden.no',
    siteName: 'Tilbudsboden.no',
    title: 'Tilbudsboden.no - Fra Eiksenteret Sortland',
    description:
      'Restpartier, kampanjevarer, demo- og utstillingsvarer og ekstra gode kjøp fra Eiksenteret Sortland.',
    images: [
      {
        url: '/opengraph-tilbudsboden.png',
        width: 1200,
        height: 630,
        alt: 'Tilbudsboden.no - restpartier, kampanjevarer og demo- og utstillingsvarer fra Eiksenteret Sortland',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tilbudsboden.no - Fra Eiksenteret Sortland',
    description:
      'Restpartier, kampanjevarer, demo- og utstillingsvarer og ekstra gode kjøp fra Eiksenteret Sortland.',
    images: ['/opengraph-tilbudsboden.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
