export function encodeDays(estimate: any): number {
  if (estimate === undefined || estimate === null || estimate === '') {
    return 3;
  }
  const clean = String(estimate).replace(/\s+/g, '');
  if (clean.includes('-')) {
    const parts = clean.split('-');
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    if (!isNaN(min) && !isNaN(max) && min < max) {
      return min * 100 + max;
    }
  }
  const val = parseInt(clean, 10);
  return isNaN(val) ? 3 : val;
}

export function decodeDays(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return '3';
  if (val >= 100) {
    const min = Math.floor(val / 100);
    const max = val % 100;
    return `${min}-${max}`;
  }
  return String(val);
}
