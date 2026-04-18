import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneMockup } from './PhoneMockup';
import { FeaturePoint } from './FeaturePoint';
import { ScrollIndicator } from './ScrollIndicator';

type FeatureDef = { label: string; top: string; left: string } | null;

type SectionDef = {
  title: string;
  subtitle: string;
  detail?: string;
  rotateX: number;
  rotateY: number;
  scale: number;
  feature?: FeatureDef;
};

const SECTIONS: SectionDef[] = [
  {
    title: 'TECHMART',
    subtitle: 'Trải nghiệm công nghệ\nđỉnh cao',
    rotateX: -20,
    rotateY: -30,
    scale: 0.8,
    feature: null,
  },
  {
    title: 'Thiết kế\nhoàn hảo',
    subtitle: 'Màn hình Super Retina XDR\n6.7 inch — sắc nét đến từng pixel',
    detail: 'Công nghệ ProMotion 120Hz',
    rotateX: 0,
    rotateY: 0,
    scale: 1.1,
    feature: { label: 'Dynamic Island', top: '7%', left: '50%' },
  },
  {
    title: 'Hiệu năng\nvượt trội',
    subtitle: 'Chip A17 Pro — Nhanh hơn.\nMạnh hơn. Thông minh hơn.',
    detail: 'GPU 6 nhân · Neural Engine 16 nhân',
    rotateX: 10,
    rotateY: 25,
    scale: 1.0,
    feature: { label: 'Chip A17 Pro', top: '50%', left: '92%' },
  },
  {
    title: 'Camera\nchuyên nghiệp',
    subtitle: 'Hệ thống 3 camera 48MP\nChụp đêm vượt trội',
    detail: 'Zoom quang học 5x · ProRAW · ProRes',
    rotateX: -5,
    rotateY: -20,
    scale: 1.05,
    feature: { label: 'Camera 48MP', top: '15%', left: '12%' },
  },
  {
    title: 'Pin cả ngày\ndùng thoải mái',
    subtitle: 'Lên đến 29 giờ xem video\nSạc nhanh USB-C',
    detail: 'Sạc 50% trong 30 phút',
    rotateX: 5,
    rotateY: 15,
    scale: 0.95,
    feature: { label: 'USB-C', top: '96%', left: '50%' },
  },
  {
    title: 'Mua ngay\ntại Techmart',
    subtitle: 'Giá chỉ từ 34.990.000₫\nTrả góp 0% — Freeship toàn quốc',
    rotateX: 0,
    rotateY: 0,
    scale: 1.0,
    feature: null,
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    rafRef.current = null;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = el.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    const scrolled = Math.max(0, -rect.top);
    const p = Math.max(0, Math.min(1, scrolled / total));
    setProgress(p);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  const total = SECTIONS.length;
  const raw = progress * total;
  const activeIdx = Math.min(total - 1, Math.floor(raw));
  const t = Math.min(1, raw - activeIdx);
  const nextIdx = Math.min(total - 1, activeIdx + 1);
  const curr = SECTIONS[activeIdx];
  const next = SECTIONS[nextIdx];

  const rotateX = lerp(curr.rotateX, next.rotateX, t);
  const rotateY = lerp(curr.rotateY, next.rotateY, t);
  const scale = lerp(curr.scale, next.scale, t);

  const hintOpacity =
    activeIdx === 0 ? Math.max(0, 1 - t * 2.5) : 0;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: '300vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Ambient background */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.10), transparent 42%), radial-gradient(circle at 70% 30%, rgba(139,92,246,0.07), transparent 45%), #000000',
          }}
        />

        {/* Main layout */}
        <div className="relative h-full w-full max-w-7xl mx-auto px-6 lg:px-10 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 pt-24 pb-16">
          {/* Text panel */}
          <div className="relative flex-1 w-full h-full min-h-[320px] z-10">
            {SECTIONS.map((s, i) => {
              const isActive = i === activeIdx;
              const isFirst = i === 0;
              const isLast = i === total - 1;
              const fadeIn = Math.min(1, t / 0.15);
              const fadeOut = Math.min(1, (1 - t) / 0.15);
              const opacity = !isActive
                ? 0
                : Math.min(isFirst ? 1 : fadeIn, isLast ? 1 : fadeOut);
              const translate = (1 - opacity) * 18;
              return (
                <div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center"
                  style={{
                    opacity,
                    transform: `translateY(${translate}px)`,
                    transition:
                      'opacity 0.35s ease, transform 0.45s ease',
                    pointerEvents: opacity > 0.5 ? 'auto' : 'none',
                  }}
                >
                  <h1
                    className="font-extrabold text-white whitespace-pre-line leading-[1.05]"
                    style={{
                      fontSize: isFirst
                        ? 'clamp(44px, 7.5vw, 72px)'
                        : 'clamp(34px, 5.5vw, 56px)',
                      letterSpacing: '-1px',
                    }}
                  >
                    {s.title}
                  </h1>
                  <p className="mt-6 text-white/60 whitespace-pre-line leading-relaxed text-base md:text-lg max-w-md">
                    {s.subtitle}
                  </p>
                  {s.detail && (
                    <p
                      className="mt-4 font-medium text-sm md:text-base"
                      style={{ color: 'rgba(59,130,246,0.9)' }}
                    >
                      {s.detail}
                    </p>
                  )}
                  {isLast && (
                    <div className="mt-10 flex flex-col sm:flex-row gap-4">
                      <Link
                        to="/products"
                        onClick={() => window.scrollTo(0, 0)}
                        className="px-8 py-3.5 rounded-full font-semibold text-white text-center hover:brightness-110 transition"
                        style={{
                          background:
                            'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          boxShadow:
                            '0 10px 30px rgba(59,130,246,0.35)',
                        }}
                      >
                        Mua ngay
                      </Link>
                      <Link
                        to="/"
                        onClick={() => window.scrollTo(0, 0)}
                        className="px-8 py-3.5 rounded-full font-semibold text-white text-center border border-white/20 hover:bg-white/5 transition"
                      >
                        Tìm hiểu thêm
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Phone panel (desktop only) */}
          <div className="hidden lg:flex relative flex-1 items-center justify-center">
            <div
              className="relative"
              style={{ perspective: '1200px' }}
            >
              <PhoneMockup
                rotateX={rotateX}
                rotateY={rotateY}
                scale={scale}
              />
              {SECTIONS.map((s, i) =>
                s.feature ? (
                  <FeaturePoint
                    key={i}
                    label={s.feature.label}
                    top={s.feature.top}
                    left={s.feature.left}
                    visible={i === activeIdx}
                  />
                ) : null
              )}
            </div>
          </div>
        </div>

        <ScrollIndicator
          activeIdx={activeIdx}
          total={total}
          hintOpacity={hintOpacity}
        />
      </div>
    </div>
  );
}
