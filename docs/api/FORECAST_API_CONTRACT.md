# Forecast AI Service API Contract

This is the proposed frontend integration contract. The current `ai-service/`
contains data preparation only; the prediction endpoint and model are not
implemented yet. The frontend does not fabricate results or fall back to sample
predictions when the service is unavailable.

## Connection

- Base URL: `VITE_AI_SERVICE_BASE_URL`; defaults to `http://localhost:8000`.
- Method and path: `POST /forecast`
- Content type: `application/json`
- The AI service is called directly and must allow the frontend origin through
  CORS. Configure a proxy or gateway if the service should not be exposed to the
  browser.

## Request

```json
{
  "sku": "SKU-001",
  "horizonDays": 30
}
```

`sku` identifies the selected product and `horizonDays` is one of `7`, `14`,
`30`, or `60`. Until the UI supports warehouse selection, the service should
aggregate that SKU's sales across warehouses.

## Successful response

```json
{
  "sku": "SKU-001",
  "horizonDays": 2,
  "generatedAt": "2026-10-25T00:00:00Z",
  "predictions": [
    {
      "date": "2026-10-26",
      "predictedDemand": 12,
      "lowerBound": 9,
      "upperBound": 15
    },
    {
      "date": "2026-10-27",
      "predictedDemand": 14,
      "lowerBound": 10,
      "upperBound": 18
    }
  ]
}
```

`predictions` must contain exactly one non-negative `predictedDemand` per day,
with unique ISO dates in the forecast window. `lowerBound` and `upperBound` may
be `null` when the model does not provide an interval; otherwise they must be
non-negative and ordered. `generatedAt` is optional. The response echoes the
requested SKU and horizon so the client can reject stale or mismatched results.

Errors should use a non-2xx HTTP status and include a useful `message`, `detail`,
or the backend-style `error.message`. The frontend surfaces those errors and
does not hide authorization, server, or network failures.
