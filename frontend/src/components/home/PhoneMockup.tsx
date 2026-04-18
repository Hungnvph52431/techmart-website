type Props = {
  rotateX: number;
  rotateY: number;
  scale: number;
};

const PRODUCTS = [
  {
    name: 'iPhone 15 Pro Max',
    price: '34.990.000₫',
    accent: 'linear-gradient(135deg, #60a5fa, #1e3a8a)',
    priceColor: '#60a5fa',
  },
  {
    name: 'Galaxy S24 Ultra',
    price: '31.990.000₫',
    accent: 'linear-gradient(135deg, #a78bfa, #5b21b6)',
    priceColor: '#a78bfa',
  },
  {
    name: 'MacBook Air M3',
    price: '27.490.000₫',
    accent: 'linear-gradient(135deg, #22d3ee, #0e7490)',
    priceColor: '#22d3ee',
  },
  {
    name: 'AirPods Pro 2',
    price: '5.990.000₫',
    accent: 'linear-gradient(135deg, #fde68a, #b45309)',
    priceColor: '#fde68a',
  },
];

export function PhoneMockup({ rotateX, rotateY, scale }: Props) {
  return (
    <div
      className="relative"
      style={{
        width: 260,
        height: 540,
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
        transition: 'transform 0.1s ease-out',
        willChange: 'transform',
        filter: 'drop-shadow(0 25px 80px rgba(0,0,0,0.6))',
      }}
    >
      {/* Metallic frame */}
      <div
        className="absolute inset-0 rounded-[44px]"
        style={{
          background:
            'linear-gradient(145deg, #2b2b30 0%, #101013 50%, #1f1f23 100%)',
          border: '3px solid #444',
          boxShadow:
            '0 0 120px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5)',
        }}
      />

      {/* Screen */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          borderRadius: 32,
          background: 'linear-gradient(180deg, #0a0a16 0%, #05050e 100%)',
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-10"
          style={{
            top: 10,
            width: 100,
            height: 28,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        />

        {/* App UI */}
        <div className="relative pt-14 px-3 pb-3 flex flex-col h-full gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              }}
            />
            <span className="font-bold text-[11px] bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent tracking-tight">
              TECHMART
            </span>
          </div>

          <div
            className="rounded-2xl px-3 py-2.5 text-white text-[10px] font-semibold flex items-center justify-between"
            style={{
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
            }}
          >
            <span>⚡ Flash Sale</span>
            <span>Giảm 50%</span>
          </div>

          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl px-2.5 py-2 flex items-center gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex-shrink-0"
                style={{ background: p.accent }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[9px] font-semibold truncate">
                  {p.name}
                </p>
                <p
                  className="text-[9px] font-bold mt-0.5"
                  style={{ color: p.priceColor }}
                >
                  {p.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection overlay */}
      <div
        className="absolute inset-0 rounded-[44px] pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.06) 100%)',
        }}
      />
    </div>
  );
}
