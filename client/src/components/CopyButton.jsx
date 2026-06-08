import { useState } from 'react';

export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`text-xs px-1.5 py-0.5 rounded border border-gold/30 hover:border-gold/60 text-parchment/60 hover:text-gold transition-colors ${className}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}
