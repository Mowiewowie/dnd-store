export function TabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-gold/20 mb-6">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-6 pb-2 text-sm font-semibold transition-colors ${
            activeTab === key
              ? 'text-gold border-b-2 border-gold -mb-px'
              : 'text-parchment/40 hover:text-parchment/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
