const RARITY_COLORS = {
  Common: 'text-parchment/40 border-parchment/20',
  Uncommon: 'text-emerald-400/80 border-emerald-700/50',
  Rare: 'text-sky-400/80 border-sky-700/50',
  'Very Rare': 'text-violet-400/80 border-violet-700/50',
  Legendary: 'text-amber-400 border-amber-600/50',
};

export function RarityBadge({ rarity }) {
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  return (
    <span className={`text-xs border px-2 py-0.5 rounded ${colors}`}>
      {rarity || 'Common'}
    </span>
  );
}
