import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eikbutikk.no - Utvalgte kvalitetsprodukter & gode tilbud | Eiksenteret Sortland',
  description: 'Gjør et godt kjøp på robotklippere, snøfresere, høytrykksvaskere og aggregater fra Eiksenteret Sortland.',
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