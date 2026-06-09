import { useState } from 'react';
import { OrnamentDivider } from './OrnamentDivider.jsx';
import { GOLD_UNIT_TO_CP } from '../utils/constants.js';

const INITIAL = { amount: '', unit: 'gp', direction: 'add', notes: '' };

export function GoldAdjustForm({
  onAdjust,
  receiveLabel = 'Receive',
  spendLabel = 'Spend / Lose',
  submitLabel = 'Log Change',
  notesPlaceholder = 'Reason (optional)',
  heading = 'Adjust Gold',
}) {
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setError('Enter a positive amount'); return; }
    let deltaCp = Math.round(amount * GOLD_UNIT_TO_CP[form.unit]);
    if (form.direction === 'subtract') deltaCp = -deltaCp;
    try {
      await onAdjust(deltaCp, form.notes.trim() || undefined);
      setForm(INITIAL);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card-fancy p-4 mb-6">
      <h2 className="fantasy-heading text-sm mb-1">{heading}</h2>
      <OrnamentDivider className="my-2" />
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <select value={form.direction} onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}
            className="input-field text-sm !w-auto" style={{ colorScheme: 'dark' }}>
            <option value="add">{receiveLabel}</option>
            <option value="subtract">{spendLabel}</option>
          </select>
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="Amount" className="input-field text-sm flex-1" />
          <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
            className="input-field text-sm !w-auto" style={{ colorScheme: 'dark' }}>
            <option value="gp">GP</option>
            <option value="sp">SP</option>
            <option value="cp">CP</option>
          </select>
        </div>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder={notesPlaceholder} className="input-field text-sm" />
        {error && <p className="text-ember-light text-xs">{error}</p>}
        <button type="submit" className="btn btn-primary w-full py-2 text-sm">{submitLabel}</button>
      </form>
    </div>
  );
}
