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
