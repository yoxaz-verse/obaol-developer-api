/**
 * @file Sanitization helpers.
 */

const INTERNAL_FIELDS = new Set(['_id', '__v', 'key_hash']);

/**
 * Sanitizes a single document/object by removing internal fields.
 * @param {object} doc Mongoose document or plain object.
 * @param {string[]} [extraHidden=[]] Extra fields to hide.
 * @returns {object|null}
 */
function sanitizeDoc(doc, extraHidden = []) {
  if (!doc) return null;
  const source = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const hidden = new Set([...INTERNAL_FIELDS, ...extraHidden]);
  const out = {};

  for (const [key, value] of Object.entries(source)) {
    if (hidden.has(key)) continue;
    out[key] = value;
  }

  return out;
}

/**
 * Sanitizes a list of documents.
 * @param {Array<object>} docs
 * @param {string[]} [extraHidden=[]]
 * @returns {Array<object>}
 */
function sanitizeList(docs, extraHidden = []) {
  if (!Array.isArray(docs)) return [];
  return docs.map((doc) => sanitizeDoc(doc, extraHidden));
}

module.exports = {
  sanitizeDoc,
  sanitizeList
};
