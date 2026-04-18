type Props = {
  activeIdx: number;
  total: number;
  hintOpacity: number;
};

export function ScrollIndicator({ activeIdx, total, hintOpacity }: Props) {
  return (
    <>
      {/* Progress dots */}
      <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
        {Array.from({ length: total }).map((_, i) => {
          const active = i === activeIdx;
          return (
            <span
              key={i}
              className="rounded-full block"
              style={{
                width: 3,
                height: active ? 28 : 12,
                background: active ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.4s ease',
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
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
          Scroll to Explore
        </span>
        <div className="relative h-10 w-px overflow-hidden bg-white/10">
          <span
            className="absolute inset-x-0 h-4 bg-gradient-to-b from-blue-500 to-transparent"
            style={{ animation: 'techmartScrollLine 1.8s ease-in-out infinite' }}
          />
        </div>
      </div>
    </>
  );
}
