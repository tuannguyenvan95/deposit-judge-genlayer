/**
 * Format a GEN token amount for display.
 * Accepts wei strings (BigInt-backed) or already-formatted decimal strings.
 * Strings with a decimal point are returned as-is.
 * Strings >= 10 chars are treated as wei and converted to GEN (÷1e18).
 */
export const formatGen = (val: string | number | undefined | null): string => {
  if (!val || val === '0' || val === 0) return '0';
  const s = String(val);
  if (s.includes('.')) return s;
  try {
    if (s.length >= 10) {
      const num = Number(s) / 1e18;
      return Number.isInteger(num) ? num.toString() : num.toFixed(4).replace(/\.?0+$/, '');
    }
    return s;
  } catch {
    return s;
  }
};
