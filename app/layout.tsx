import type { Metadata, Viewport } from 'next';
import './globals.css';

const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Kagel — Votre séance de Kegel',
  description: 'Un minuteur de Kegel agréable, simple et installable, avec des séances guidées et personnalisables.',
  applicationName: 'Kagel',
  manifest: base + '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Kagel' },
  icons: {
    icon: [
      { url: base + '/icon.svg', type: 'image/svg+xml' },
      { url: base + '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: base + '/icons/apple-touch.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d2030',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-startup-image" href={base + '/splash/iphone.png'} media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href={base + '/splash/iphone-pro.png'} media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href={base + '/splash/iphone-max.png'} media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href={base + '/splash/ipad.png'} media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body>{children}</body>
    </html>
  );
}
