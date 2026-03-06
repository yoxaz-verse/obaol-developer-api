# OBAOL API

Developer API backend for OBAOL commodity and trade automation workflows.

## ChatGPT Integration

This API supports ChatGPT Custom GPT Actions via OpenAPI schema.

- OpenAPI schema: [https://api.obaol.com/openapi.yaml](https://api.obaol.com/openapi.yaml)
- API metadata: [https://api.obaol.com/api/info](https://api.obaol.com/api/info)
- Lightweight docs: [https://api.obaol.com/docs](https://api.obaol.com/docs)

### Authentication

All `/v1/*` business endpoints require API key authentication using:

`Authorization: Bearer <API_KEY>`

### Main action endpoints

- `GET /v1/prices`
- `GET /v1/traders`
- `POST /v1/inquiries`
- `POST /v1/calculate/cif`
- `GET /health` (public)

## ChatGPT App Integration

The OBAOL Developer API also exposes an MCP endpoint for agent/tool integrations.

- MCP endpoint: [https://api.obaol.com/mcp](https://api.obaol.com/mcp)
- MCP info: [https://api.obaol.com/mcp/info](https://api.obaol.com/mcp/info)
- MCP health: [https://api.obaol.com/mcp/health](https://api.obaol.com/mcp/health)
- Transport:
  - `GET /mcp` for SSE stream
  - `POST /mcp?sessionId=...` for MCP JSON-RPC messages
- Authentication:
  - Connect (`GET /mcp`): no auth required
  - Messages (`POST /mcp`): API key required via either:
    - `Authorization: Bearer <API_KEY>`
    - `?apiKey=<API_KEY>`
    - `?connectorToken=<MCP_CONNECTOR_TOKEN>`

### Why `/mcp` looks like a blank page

`/mcp` is an SSE stream endpoint, not an HTML page. Opening it directly in a browser tab can appear blank while the stream stays open.  
For human verification, use `/mcp/info` and `/mcp/health`.

### ChatGPT App connector setup

Use these settings in ChatGPT Apps:

1. MCP Server URL: `https://api.obaol.com/mcp?connectorToken=<MCP_CONNECTOR_TOKEN>`
2. Authentication: `No Auth`
3. Leave custom headers empty (token is in query for this compatibility phase).
4. Rotate/revoke connector tokens and treat connector URLs as secrets.

### Developer connector token endpoints

Developer JWT protected endpoints for managing MCP connector tokens:

- `GET /v1/dev-mcp/connectors`
- `POST /v1/dev-mcp/connectors`
- `POST /v1/dev-mcp/connectors/:id/revoke`
- `POST /v1/dev-mcp/validate`

### MCP tools

- `get_prices` -> fetch commodity prices
- `get_traders` -> fetch traders with optional `verified` filter
- `create_inquiry` -> create inquiry using `{ commodity, quantity, buyer }` where `buyer` is buyer email
- `calculate_cif` -> compute CIF from `{ fob, freight, insurance? }`
