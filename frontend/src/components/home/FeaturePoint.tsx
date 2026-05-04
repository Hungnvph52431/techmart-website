type Props = {
  label: string;
  top: string;
  left: string;
  visible: boolean;
};

export function FeaturePoint({ label, top, left, visible }: Props) {
  const extendRight = parseFloat(left) >= 50;

  const dot = (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24 }}>
      {/* Outer pulse ring */}
      <div
        style={{
          position: 'absolute',
          width: 24, height: 24,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.18)',
          animation: visible ? 'fpPulse 2s ease-out infinite' : 'none',
        }}
      />
      {/* Inner pulse ring */}
      <div
        style={{
          position: 'absolute',
          width: 16, height: 16,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.25)',
          animation: visible ? 'fpPulse 2s ease-out infinite 0.5s' : 'none',
        }}
      />
      {/* Core dot */}
      <div
        style={{
          width: 9, height: 9,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
          boxShadow: '0 0 12px rgba(59,130,246,1), 0 0 28px rgba(59,130,246,0.6)',
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  );

  const line = (
    <div
      style={{
        width: 44,
        height: 1,
        background: extendRight
          ? 'linear-gradient(90deg, rgba(59,130,246,0.9), rgba(59,130,246,0.15))'
          : 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,0.9))',
      }}
    />
  );

  const labelEl = (
    <span
      style={{
        fontSize: 11.5,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: 'rgba(10,10,20,0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '3px 9px',
        borderRadius: 7,
        border: '1px solid rgba(59,130,246,0.3)',
        letterSpacing: '0.1px',
      }}
    >
      {label}
    </span>
  );

  return (
    <>
      <style>{`
        @keyframes fpPulse {
          0%   { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          top,
          left,
          transform: `translate(-50%, -50%) translateX(${visible ? 0 : (extendRight ? -24 : 24)}px)`,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {extendRight ? (
            <>{dot}{line}{labelEl}</>
          ) : (
            <>{labelEl}{line}{dot}</>
          )}
        </div>
      </div>
    </>
  );
}
