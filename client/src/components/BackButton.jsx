export function BackButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 mb-6 px-3 py-1.5 rounded border border-gold/20 hover:border-gold/50 text-parchment/60 hover:text-parchment text-sm transition-colors"
    >
      ← {label}
    </button>
  );
}
