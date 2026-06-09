const BTN = 'w-7 h-7 flex items-center justify-center rounded border border-gold/20 hover:border-gold/50 text-parchment/60 hover:text-parchment transition-colors';

export function QuantityStepper({ value, onChange, min = 1, max }) {
  function step(delta) {
    const next = Math.max(min, max !== undefined ? Math.min(max, value + delta) : value + delta);
    onChange(next);
  }
  function handleChange(e) {
    const parsed = parseInt(e.target.value) || min;
    onChange(Math.max(min, max !== undefined ? Math.min(max, parsed) : parsed));
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} className={BTN}>−</button>
      <input type="number" min={min} max={max} value={value} onChange={handleChange}
        className="input-field text-sm text-center !w-12" />
      <button type="button" onClick={() => step(1)} className={BTN}>+</button>
    </div>
  );
}
