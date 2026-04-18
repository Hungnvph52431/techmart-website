import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ChevronUp } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const ScrollToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      aria-label="Lên đầu trang"
    >
      <ChevronUp size={22} />
    </button>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const hideFooter = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <ScrollToTop />
    </div>
  );
};
