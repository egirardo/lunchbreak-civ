const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function turnsToComplete(remaining: number, perTurn: number): number | null {
  if (remaining <= 0) return 0;
  if (perTurn <= 0) return null;
  return Math.ceil(remaining / perTurn);
}

export function turnsLabel(turns: number | null): string {
  if (turns === null) return "never";
  if (turns <= 1) return "1 turn";
  return `${turns} turns`;
}

export function minutesLabel(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "under 1 min";
  return `${m} min`;
}
