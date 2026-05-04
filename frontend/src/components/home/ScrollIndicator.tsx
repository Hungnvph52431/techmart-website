type Props = {
  activeIdx: number;
  total: number;
  hintOpacity: number;
};

export function ScrollIndicator({ activeIdx, total, hintOpacity }: Props) {
  return (
    <>
      {/* Progress dots */}
      <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-2.5 z-30">
        {/* Section counter */}
        <span style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: 2,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'Inter, sans-serif',
        }}>
          {String(activeIdx + 1).padStart(2, '0')}<span style={{ opacity: 0.5 }}>/{String(total).padStart(2, '0')}</span>
        </span>

        {Array.from({ length: total }).map((_, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={i}
              className="rounded-full block"
              style={{
                width: active ? 4 : 3,
                height: active ? 32 : 10,
                background: active
                  ? 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)'
                  : 'rgba(255,255,255,0.18)',
                boxShadow: active ? '0 0 12px rgba(59,130,246,0.7), 0 0 4px rgba(147,197,253,0.5)' : 'none',
                transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          );
        })}
      </div>

      {/* Scroll to Explore */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-10 flex flex-col items-center gap-3 z-30 pointer-events-none"
        style={{
          opacity: hintOpacity,
          transition: 'opacity 0.4s ease',
        }}
      >
        <span style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.32em',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        }}>
          Scroll to Explore
        </span>
        <div className="relative h-10 w-px overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <span
            className="absolute inset-x-0 h-5"
            style={{
              background: 'linear-gradient(180deg, transparent, #60a5fa, transparent)',
              animation: 'techmartScrollLine 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </>
  );
}
