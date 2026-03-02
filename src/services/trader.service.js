/**
 * @file Trader service.
 */

const Trader = require('../models/Trader');
const { sanitizeList } = require('../utils/sanitize');

/**
 * Returns trader list filtered by verification status when provided.
 * @param {object} params
 * @param {string|boolean} [params.verified]
 * @returns {Promise<Array<object>>}
 */
async function getTraders({ verified }) {
  const query = {};

  if (verified !== undefined && verified !== null && verified !== '') {
    if (String(verified).toLowerCase() === 'true') query.verified = true;
    if (String(verified).toLowerCase() === 'false') query.verified = false;
  }

  const rows = await Trader.find(query).sort({ createdAt: -1 }).lean();
  return sanitizeList(rows);
}

module.exports = {
  getTraders
};
