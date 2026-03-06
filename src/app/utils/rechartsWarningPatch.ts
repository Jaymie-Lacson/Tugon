/**
 * rechartsWarningPatch.ts
 *
 * Targeted suppression of a persistent recharts library bug in CartesianGrid.js
 * where both `HorizontalGridLines` and `VerticalGridLines` independently map their
 * respective point arrays using `"line-" + i` as React element keys.  Because
 * React checks keys across all array-rendered siblings within a parent, the
 * collision produces a duplicate-key warning even when `vertical={false}` or
 * `horizontal={false}` is set — recharts v3 still runs both coordinate generators
 * before short-circuiting the render, and the resulting elements are hoisted into
 * the same React child array by the enclosing <g>.
 *
 * Root cause : recharts/recharts — CartesianGrid.js lines 118/122 (horizontal)
 *              and 152/158 (vertical) both use `key: "line-".concat(i)`.
 * Affects    : recharts v2.x and v3.x (confirmed v3.7.0).
 * Our fix    : `vertical={false}` / `horizontal={false}` on every CartesianGrid
 *              instance in the app PLUS this one-time console.error filter so the
 *              noise is eliminated from the dev console until recharts ships a fix.
 *
 * The filter is intentionally narrow: it only suppresses messages that mention
 * BOTH a "unique key" constraint AND "CartesianGrid" in the call arguments,
 * so all other duplicate-key warnings from application code remain visible.
 */

const _originalConsoleError = console.error.bind(console);

console.error = (...args: unknown[]): void => {
  // Build a single string from all arguments so we can pattern-match regardless
  // of how React formats the warning (React 17, 18, and 19 each use slightly
  // different argument layouts for component-stack appending).
  const combined = args
    .map((a) => (typeof a === 'string' ? a : ''))
    .join(' ');

  const isUniqueKeyWarning =
    combined.includes('unique') &&
    (combined.includes('"key"') || combined.includes("'key'") || combined.includes('key prop'));

  const isFromCartesianGrid =
    combined.includes('CartesianGrid') ||
    combined.includes('recharts-cartesian-grid') ||
    combined.includes('HorizontalGridLines') ||
    combined.includes('VerticalGridLines');

  if (isUniqueKeyWarning && isFromCartesianGrid) {
    // Silently drop — this is a known recharts library defect, not app code.
    return;
  }

  _originalConsoleError(...args);
};
