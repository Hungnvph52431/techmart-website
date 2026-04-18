type Props = {
  label: string;
  top: string;
  left: string;
  visible: boolean;
};

export function FeaturePoint({ label, top, left, visible }: Props) {
  const extendRight = parseFloat(left) >= 50;

  const line = (
    <div
      className="h-px"
      style={{
        width: 40,
        background: extendRight
          ? 'linear-gradient(90deg, rgba(59,130,246,0.9), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(59,130,246,0.9))',
      }}
    />
  );

  const labelEl = (
    <span className="text-[13px] text-white/70 whitespace-nowrap">{label}</span>
  );

  const dot = (
    <div
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: '#3b82f6',
        boxShadow:
          '0 0 10px rgba(59,130,246,0.9), 0 0 22px rgba(59,130,246,0.5)',
      }}
    />
  );

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        top,
        left,
        transform: `translate(-50%, -50%) translateX(${visible ? 0 : -20}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <div className="flex items-center gap-2">
        {extendRight ? (
          <>
            {dot}
            {line}
            {labelEl}
          </>
        ) : (
          <>
            {labelEl}
            {line}
            {dot}
          </>
        )}
      </div>
    </div>
  );
}
