export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast-base toast-enter" role="status" aria-live="polite">
      <span className="text-gold/60 text-base leading-none select-none">✦</span>
      <span>{message}</span>
    </div>
  );
}
