const RARITY_COLORS = {
  Common: 'text-gray-300 border-gray-500',
  Uncommon: 'text-green-400 border-green-600',
  Rare: 'text-blue-400 border-blue-600',
  'Very Rare': 'text-purple-400 border-purple-600',
  Legendary: 'text-orange-400 border-orange-500',
};

export function RarityBadge({ rarity }) {
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  return (
    <span className={`text-xs border px-2 py-0.5 rounded ${colors}`}>
      {rarity || 'Common'}
    </span>
  );
}
