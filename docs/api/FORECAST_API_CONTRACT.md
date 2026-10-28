# Forecast API Contract

The browser calls the authenticated Spring Boot API. Spring Boot validates the
request, calls the internal AI service, validates/maps its snake_case response
to the backend camelCase DTO, and returns the standard API envelope.

## Connection

- Backend base URL: `VITE_API_BASE_URL` (defaults to `http://localhost:8080/api`)
- AI service base URL: `AI_SERVICE_BASE_URL` (defaults to `http://localhost:8000`)
- Backend AI connect/read timeouts: `AI_SERVICE_CONNECT_TIMEOUT` (3 seconds) and
  `AI_SERVICE_READ_TIMEOUT` (35 seconds)
- Both forecast endpoints require a valid backend JWT.

## Generate a forecast

`POST /api/forecast/demand`

```json
{
  "productId": 15,
  "warehouseId": 2,
  "horizonDays": 14,
  "startDate": "2026-10-29",
  "includeConfidenceIntervals": true
}
```

`warehouseId`, `startDate`, and `includeConfidenceIntervals` are optional.
`horizonDays` must be between 1 and 90. When the request is forwarded, Spring
Boot maps these fields to the AI service's snake_case contract:
`POST /api/forecast/demand`.

The response uses the standard `{ success, data, error, timestamp }` envelope.
The `data` fields use camelCase (`productId`, `forecastStartDate`,
`predictedDemand`, etc.). Spring Boot rejects AI responses that do not echo the
requested product, warehouse, and horizon, or have invalid dates, bounds, or
prediction counts. Model totals are recalculated from validated daily values.

AI connectivity failures return `502` with `AI_SERVICE_UNAVAILABLE`, timeouts
return `504` with `AI_SERVICE_TIMEOUT`, and malformed AI responses return `502`
with `AI_SERVICE_INVALID_RESPONSE`.

## Model metadata

`GET /api/forecast/models` forwards to the AI service's
`GET /api/forecast/models` and maps model metadata to camelCase inside the same
backend envelope.
