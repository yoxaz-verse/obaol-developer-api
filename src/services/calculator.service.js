/**
 * @file Calculator service for CIF/CFR.
 */

/**
 * Parses numeric input safely.
 * @param {any} value
 * @param {string} field
 * @param {boolean} required
 * @returns {number|undefined}
 */
function parseNumber(value, field, required = true) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    if (!required) return undefined;
    const err = new Error(`${field} must be a valid number.`);
    err.statusCode = 400;
    throw err;
  }
  if (n < 0) {
    const err = new Error(`${field} cannot be negative.`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

/**
 * Computes CFR/CIF from FOB + freight + insurance.
 * @param {object} payload
 * @returns {object}
 */
function calculateCif(payload) {
  const fob = parseNumber(payload?.fob, 'fob', true);
  const freight = parseNumber(payload?.freight, 'freight', true);
  const directInsurance = payload?.insurance !== undefined ? parseNumber(payload.insurance, 'insurance', false) : undefined;
  const insuranceRatePct = payload?.insuranceRatePct !== undefined
    ? parseNumber(payload.insuranceRatePct, 'insuranceRatePct', false)
    : undefined;

  const cfr = Number((fob + freight).toFixed(2));

  let insurance = directInsurance;
  let insuranceMethod = 'direct';

  if (insurance === undefined) {
    const pct = insuranceRatePct !== undefined ? insuranceRatePct : 1;
    insurance = Number((cfr * (pct / 100)).toFixed(2));
    insuranceMethod = 'percentage';
  }

  const cif = Number((cfr + insurance).toFixed(2));

  return {
    cfr,
    cif,
    breakdown: {
      fob,
      freight,
      insurance,
      insuranceMethod,
      insuranceRatePct: insuranceMethod === 'percentage' ? (insuranceRatePct !== undefined ? insuranceRatePct : 1) : null
    }
  };
}

module.exports = {
  calculateCif
};
