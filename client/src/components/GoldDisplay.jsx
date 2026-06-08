import { formatGold } from '../utils/gold.js';

export function GoldDisplay({ gp, sp, cp, className = '' }) {
  return (
    <span className={`font-semibold text-gold ${className}`}>
      🪙 {formatGold(gp, sp, cp)}
    </span>
  );
}
