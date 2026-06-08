export function toCP(gp, sp, cp) {
  return (Math.floor(gp) * 100) + (Math.floor(sp) * 10) + Math.floor(cp);
}

export function fromCP(totalCp) {
  const gp = Math.floor(totalCp / 100);
  const remainder = totalCp % 100;
  const sp = Math.floor(remainder / 10);
  const cp = remainder % 10;
  return { gp, sp, cp };
}

export function formatGold(gp, sp, cp) {
  const parts = [];
  if (gp > 0) parts.push(`${gp} GP`);
  if (sp > 0) parts.push(`${sp} SP`);
  if (cp > 0) parts.push(`${cp} CP`);
  return parts.length > 0 ? parts.join(' ') : '0 CP';
}
