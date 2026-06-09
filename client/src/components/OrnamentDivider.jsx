export function OrnamentDivider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 my-4 ${className}`}>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)' }}
      />
      <span
        aria-hidden="true"
        className="text-gold/55 text-xs select-none"
        style={{ fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.2em' }}
      >✦ ✧ ✦</span>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)' }}
      />
    </div>
  );
}
