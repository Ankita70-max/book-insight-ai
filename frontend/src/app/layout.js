import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'BookInsight AI — Intelligent Book Discovery',
  description: 'AI-powered book discovery, analysis, and Q&A platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
