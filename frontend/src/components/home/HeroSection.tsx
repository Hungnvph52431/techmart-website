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
    subtitle: 'Điểm đến công nghệ\ntin cậy số 1',
    rotateX: -20,
    rotateY: -30,
    scale: 0.8,
    feature: null,
  },
  {
    title: 'Chính hãng\n100%',
    subtitle: 'Toàn bộ sản phẩm có tem chính hãng\nNguồn gốc rõ ràng, minh bạch hoàn toàn',
    detail: 'Tem nhập khẩu chính ngạch · Hóa đơn VAT',
    rotateX: 0,
    rotateY: 0,
    scale: 1.1,
    feature: { label: '10.000+ sản phẩm', top: '22%', left: '88%' },
  },
  {
    title: 'Giá tốt\nnhất thị trường',
    subtitle: 'Cam kết giá cạnh tranh nhất\nTrả góp 0% · Không phụ phí ẩn',
    detail: 'Giá thấp hơn — hoàn tiền 110%',
    rotateX: 10,
    rotateY: 25,
    scale: 1.0,
    feature: { label: 'Trả góp 0%', top: '55%', left: '90%' },
  },
  {
    title: 'Dịch vụ\nvượt trội',
    subtitle: 'Hỗ trợ khách hàng 24/7\nĐổi trả dễ dàng trong 30 ngày',
    detail: 'Bảo hành tận nhà · Hotline 24/7',
    rotateX: -5,
    rotateY: -20,
    scale: 1.05,
    feature: { label: 'Hoàn tiền 30 ngày', top: '18%', left: '14%' },
  },
  {
    title: 'Giao hàng\nsiêu tốc',
    subtitle: 'Freeship toàn quốc cho mọi đơn hàng\nGiao trong 2 giờ khu vực nội thành',
    detail: 'Đóng gói an toàn · Theo dõi realtime',
    rotateX: 5,
    rotateY: 15,
    scale: 0.95,
    feature: { label: 'Giao trong 2h', top: '75%', left: '12%' },
  },
  {
    title: 'Mua ngay\ntại Techmart',
    subtitle: 'Hàng nghìn sản phẩm chính hãng\nTrả góp 0% — Freeship toàn quốc',
    rotateX: 0,
    rotateY: 0,
    scale: 1.0,
    feature: null,
  },
];

// Per-section: gradient color for last title line
const SECTION_GRAD_START = ['#60a5fa', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa'];
const SECTION_GRAD_END   = ['#a78bfa', '#60a5fa', '#818cf8', '#2dd4bf', '#fb923c', '#a78bfa'];

// Label shown above title (sections 1+)
const SECTION_LABELS = ['', 'Chính hãng', 'Giá tốt', 'Dịch vụ', 'Giao hàng', 'Đặt hàng'];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SECTION_AMBIENTS = [
  { color: 'rgba(59,130,246,0.14)',  x: '28%', y: '52%' },
  { color: 'rgba(34,211,238,0.11)',  x: '72%', y: '35%' },
  { color: 'rgba(139,92,246,0.13)', x: '22%', y: '60%' },
  { color: 'rgba(16,185,129,0.11)', x: '65%', y: '42%' },
  { color: 'rgba(245,158,11,0.10)', x: '40%', y: '68%' },
  { color: 'rgba(59,130,246,0.13)', x: '50%', y: '50%' },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);
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
    // Chỉ trigger React re-render khi đổi đủ ~0.3%
    if (Math.abs(p - lastProgressRef.current) < 0.003 && p !== 0 && p !== 1) return;
    lastProgressRef.current = p;
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

  const hintOpacity = activeIdx === 0 ? Math.max(0, 1 - t * 2.5) : 0;

  return (
    <div ref={containerRef} className="relative" style={{ height: '300vh' }}>
      {/* Keyframes */}
      <style>{`
        @keyframes heroShimmer {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(110%); }
        }
        @keyframes heroDetailPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
          50%       { opacity: 0.6; box-shadow: 0 0 4px currentColor; }
        }
      `}</style>

      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* ── Top progress bar ── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 2,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${SECTION_GRAD_START[activeIdx]}, ${SECTION_GRAD_END[activeIdx]})`,
            boxShadow: `0 0 12px ${SECTION_GRAD_START[activeIdx]}`,
            zIndex: 50,
            transition: 'background 0.9s ease, box-shadow 0.9s ease',
          }}
        />

        {/* ── Ambient background static ── */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.07), transparent 42%), radial-gradient(circle at 70% 30%, rgba(139,92,246,0.05), transparent 45%), #000000',
          }}
        />


        {/* ── Dynamic ambient orbs ── */}
        {SECTION_AMBIENTS.map((a, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              width: 750,
              height: 750,
              borderRadius: '50%',
              left: a.x,
              top: a.y,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${a.color}, transparent 65%)`,
              opacity: i === activeIdx ? 1 : 0,
              transition: 'opacity 0.9s ease',
            }}
          />
        ))}


        {/* ── Main layout ── */}
        <div className="relative h-full w-full max-w-7xl mx-auto px-6 lg:px-10 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 pt-24 pb-16">

          {/* ── Text panel ── */}
          <div className="relative flex-1 w-full h-full min-h-[320px] z-10">
            {SECTIONS.map((s, i) => {
              const isActive = i === activeIdx;
              const isFirst = i === 0;
              const isLast = i === total - 1;
              const fadeIn = Math.min(1, t / 0.15);
              const fadeOut = Math.min(1, (1 - t) / 0.15);
              const opacity = !isActive
                ? 0
                : isLast
                  ? 1
                  : Math.min(isFirst ? 1 : fadeIn, fadeOut);

              const titleLines = s.title.split('\n');
              const lastLineIdx = titleLines.length - 1;
              const gradStart = SECTION_GRAD_START[i];
              const gradEnd = SECTION_GRAD_END[i];

              return (
                <div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center"
                  style={{
                    opacity,
                    pointerEvents: opacity > 0.5 ? 'auto' : 'none',
                  }}
                >
                  {/* Section label */}
                  {i > 0 && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 14,
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateX(0)' : 'translateX(-12px)',
                        transition: 'opacity 0.5s ease, transform 0.5s ease',
                      }}
                    >
                      <div style={{ width: 22, height: 1.5, background: gradStart, borderRadius: 1 }} />
                      <span style={{
                        fontSize: 11,
                        color: gradStart,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontFamily: 'Inter, sans-serif',
                      }}>
                        {String(i).padStart(2, '0')} — {SECTION_LABELS[i]}
                      </span>
                    </div>
                  )}

                  {/* Title — line-by-line reveal */}
                  <h1
                    className="font-extrabold leading-[1.05]"
                    style={{
                      fontSize: isFirst
                        ? 'clamp(48px, 8vw, 80px)'
                        : 'clamp(36px, 5.8vw, 60px)',
                      letterSpacing: '-1.5px',
                    }}
                  >
                    {titleLines.map((line, li) => {
                      const isLastLine = li === lastLineIdx;
                      return (
                        <div key={li} style={{ overflow: 'hidden', lineHeight: 1.1 }}>
                          <span
                            style={{
                              display: 'block',
                              transform: isActive ? 'translateY(0)' : 'translateY(105%)',
                              transition: `transform 0.75s ${li * 0.12}s cubic-bezier(0.16, 1, 0.3, 1)`,
                              // Last line gets gradient color
                              ...(isLastLine ? {
                                backgroundImage: `linear-gradient(90deg, ${gradStart}, ${gradEnd})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              } : {
                                color: 'white',
                              }),
                            }}
                          >
                            {line}
                          </span>
                        </div>
                      );
                    })}
                  </h1>

                  {/* Subtitle */}
                  <p
                    className="whitespace-pre-line leading-relaxed text-base md:text-lg max-w-md"
                    style={{
                      color: isLast ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.58)',
                      marginTop: 20,
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateY(0)' : 'translateY(10px)',
                      transition: 'opacity 0.6s 0.28s ease, transform 0.6s 0.28s ease',
                    }}
                  >
                    {isLast ? (
                      <>
                        Hàng nghìn sản phẩm chính hãng{'\n'}
                        <Link
                          to="/products"
                          onClick={() => window.scrollTo(0, 0)}
                          className="underline decoration-dotted hover:text-white transition"
                        >
                          Trả góp 0%
                        </Link>
                        {' — Freeship toàn quốc'}
                      </>
                    ) : (
                      s.subtitle
                    )}
                  </p>

                  {/* Detail badge */}
                  {s.detail && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 16,
                        alignSelf: 'flex-start',
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 0.5s 0.38s ease, transform 0.5s 0.38s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: `${gradStart}14`,
                          border: `1px solid ${gradStart}40`,
                          borderRadius: 24,
                          padding: '5px 14px',
                        }}
                      >
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: gradStart,
                          boxShadow: `0 0 8px ${gradStart}`,
                          animation: 'heroDetailPulse 2s ease-in-out infinite',
                          flexShrink: 0,
                        }} />
                        <span style={{ color: gradStart, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.02em' }}>
                          {s.detail}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CTA buttons (last section) */}
                  {isLast && (
                    <div
                      className="flex flex-col sm:flex-row gap-4"
                      style={{
                        marginTop: 32,
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(14px)',
                        transition: 'opacity 0.6s 0.42s ease, transform 0.6s 0.42s ease',
                      }}
                    >
                      <Link
                        to="/products"
                        onClick={() => window.scrollTo(0, 0)}
                        className="relative overflow-hidden px-8 py-3.5 rounded-full font-semibold text-white text-center"
                        style={{
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          boxShadow: '0 10px 32px rgba(59,130,246,0.4)',
                        }}
                      >
                        <span className="relative z-10">Mua ngay</span>
                        {/* Shimmer sweep */}
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                            animation: 'heroShimmer 2.8s ease-in-out infinite',
                          }}
                        />
                      </Link>
                      <Link
                        to="/home"
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

          {/* ── Phone panel (desktop only) ── */}
          <div className="hidden lg:flex relative flex-1 items-center justify-center">
            <div className="relative" style={{ perspective: '1200px' }}>
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
