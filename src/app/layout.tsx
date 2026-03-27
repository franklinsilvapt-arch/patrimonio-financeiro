import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'Património Financeiro — Agrega o teu portfólio de investimentos',
  description: 'Agrega posições de todas as tuas corretoras e bancos num só dashboard. Visualiza alocação, rentabilidade e evolução do teu portfólio.',
  metadataBase: new URL('https://patrimoniofinanceiro.pt'),
  openGraph: {
    title: 'Património Financeiro',
    description: 'Agrega posições de todas as tuas corretoras e bancos num só dashboard.',
    url: 'https://patrimoniofinanceiro.pt',
    siteName: 'Património Financeiro',
    locale: 'pt_PT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Património Financeiro',
    description: 'Agrega posições de todas as tuas corretoras e bancos num só dashboard.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${inter.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
