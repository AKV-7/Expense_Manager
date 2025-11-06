import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { NotificationProvider } from '@/contexts/notification-context';
import { ToasterWrapper } from '@/components/toaster-wrapper';

export const metadata: Metadata = {
  title: 'QUIPO',
  description: 'Split expenses with friends',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <NotificationProvider>
            {children}
            <ToasterWrapper />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
