import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'AURA OS — Votre cerveau numérique d\'entreprise',
  description: 'African Unified Reasoning Assistant Operating System — Le premier système d\'exploitation intelligent pour PME africaines',
  keywords: ['AURA OS', 'PME', 'Afrique', 'ERP', 'CRM', 'POS', 'IA', 'Intelligence Artificielle'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased" style={{ background: 'linear-gradient(135deg, #0a0015 0%, #1a0a2e 25%, #0d1b2a 50%, #1a0a2e 75%, #0a0015 100%)', backgroundAttachment: 'fixed' }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
