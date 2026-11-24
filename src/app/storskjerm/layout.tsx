import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Storskjerm | Tilbudsboden.no',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StorskjermLayout({ children }: { children: React.ReactNode }) {
  return children;
}