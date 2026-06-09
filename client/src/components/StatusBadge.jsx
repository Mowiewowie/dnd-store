export function StatusBadge({ isOpen }) {
  return isOpen
    ? <span className="badge-open">Open</span>
    : <span className="badge-closed">Closed</span>;
}
