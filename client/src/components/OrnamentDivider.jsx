export function OrnamentDivider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 my-4 ${className}`}>
      <div className="flex-1 h-px bg-gold/20" />
      <span className="text-gold/40 text-xs select-none">✦</span>
      <div className="flex-1 h-px bg-gold/20" />
    </div>
  );
}
