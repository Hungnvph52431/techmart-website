import { Link } from 'react-router-dom';
import { HeroSection } from '@/components/home/HeroSection';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/40">
      <style>{`
        @keyframes techmartScrollLine {
          0%   { transform: translateY(-100%); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(260%); opacity: 0; }
        }
      `}</style>

      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-extrabold text-lg tracking-tight"
          >
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              TECHMART
            </span>
          </button>
          <ul className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <li>
              <Link
                to="/products"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:text-white transition"
              >
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link
                to="/products?onSale=true"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:text-white transition"
              >
                Flash Sale
              </Link>
            </li>
            <li>
              <Link
                to="/payment"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:text-white transition"
              >
                Trả góp
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                onClick={() => window.scrollTo(0, 0)}
                className="hover:text-white transition"
              >
                Liên hệ
              </Link>
            </li>
          </ul>
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="md:hidden text-xs text-white/70 hover:text-white"
          >
            Vào trang chủ →
          </Link>
        </nav>
      </header>

      <HeroSection />
    </div>
  );
}
