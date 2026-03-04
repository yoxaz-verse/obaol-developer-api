/**
 * @file MCP tool definitions and execution bridge over existing services.
 */

const { getPrices } = require('../services/price.service');
const { getTraders } = require('../services/trader.service');
const { createInquiry } = require('../services/inquiry.service');
const { calculateCif } = require('../services/calculator.service');

/**
 * @typedef {object} ToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {object} inputSchema
 */

/**
 * @type {ToolDefinition[]}
 */
const TOOL_DEFINITIONS = [
  {
    name: 'get_prices',
    description: 'Fetch commodity prices from OBAOL.',
    inputSchema: {
      type: 'object',
      properties: {
        commodity: { type: 'string', description: 'Commodity filter (optional).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_traders',
    description: 'Fetch traders, optionally filtered by verified status.',
    inputSchema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean', description: 'Optional verified filter.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_inquiry',
    description: 'Create a new inquiry using commodity, quantity, and buyer information.',
    inputSchema: {
      type: 'object',
      properties: {
        commodity: { type: 'string' },
        quantity: { type: 'number' },
        buyer: { type: 'string', description: 'Buyer email address.' }
      },
      required: ['commodity', 'quantity', 'buyer'],
      additionalProperties: false
    }
  },
  {
    name: 'calculate_cif',
    description: 'Calculate CFR/CIF using FOB, freight, and optional insurance.',
    inputSchema: {
      type: 'object',
      properties: {
        fob: { type: 'number' },
        freight: { type: 'number' },
        insurance: { type: 'number' },
        insuranceRatePct: { type: 'number' }
      },
      required: ['fob', 'freight'],
      additionalProperties: false
    }
  }
];

function hasPermission(apiKey, permission) {
  const permissions = apiKey?.permissions || [];
  return permissions.includes('*') || permissions.includes(permission);
}

function deny(permission) {
  const err = new Error(`Insufficient permissions for ${permission}.`);
  err.statusCode = 403;
  throw err;
}

async function executeTool(name, args, apiKey) {
  switch (name) {
    case 'get_prices': {
      if (!hasPermission(apiKey, 'prices:read')) deny('prices:read');
      return getPrices({ commodity: args?.commodity });
    }

    case 'get_traders': {
      if (!hasPermission(apiKey, 'traders:read')) deny('traders:read');
      return getTraders({ verified: args?.verified });
    }

    case 'create_inquiry': {
      if (!hasPermission(apiKey, 'inquiries:create')) deny('inquiries:create');
      return createInquiry({
        email: args?.buyer,
        commodity: args?.commodity,
        reqFields: {
          quantity: args?.quantity,
          buyer: args?.buyer
        }
      });
    }

    case 'calculate_cif': {
      if (!hasPermission(apiKey, 'calculator:use')) deny('calculator:use');
      return calculateCif({
        fob: args?.fob,
        freight: args?.freight,
        insurance: args?.insurance,
        insuranceRatePct: args?.insuranceRatePct
      });
    }

    default: {
      const err = new Error(`Unknown MCP tool: ${name}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  executeTool
};
