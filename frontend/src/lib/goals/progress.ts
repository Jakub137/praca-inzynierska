const MINOR_UNITS_PER_UNIT = 100;
const PERCENT_SCALE = 100;

// Display only: the status, the months and the monthly contribution come from the API.
// Integer grosze avoid float errors: 29 / 100 * 100 is 28.999999999999996 (shown as 28%), 29 * 100 / 100 is 29.
// Floors, so 99.99% never reads 100% before the goal is completed. May exceed 100 after an overpayment.
export function calculateProgressPercent(
  current: number,
  target: number,
): number {
  const targetMinor = Math.round(target * MINOR_UNITS_PER_UNIT);
  if (targetMinor <= 0) {
    return 0;
  }
  const currentMinor = Math.round(current * MINOR_UNITS_PER_UNIT);
  return Math.floor((currentMinor * PERCENT_SCALE) / targetMinor);
}
