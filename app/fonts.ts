import { Italiana, Petrona, Courier_Prime } from 'next/font/google';

// Self-hosted at build time by next/font — no runtime request to Google,
// only the weights actually used are shipped, and layout shift is
// avoided automatically via size-adjust metrics.
//
// Typeset: "The Conservatory". Italiana is a fashion-house cut — hairline
// strokes, enormous tracking, caps only — so it carries display type and
// nothing else. Petrona sets running text. Courier Prime keeps every label,
// nav item, button and figure, which is what stops the pairing reading as
// couture and starts it reading as an estate glasshouse plaque.

export const fontDisplay = Italiana({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

export const fontBody = Petrona({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

export const fontMono = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});
