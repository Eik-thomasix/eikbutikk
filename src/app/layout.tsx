import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const CLARITY_PROJECT_ID = 'ymtd4eja3x';

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

        <Analytics />

        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}
        </Script>
      </body>
    </html>
  );
}
