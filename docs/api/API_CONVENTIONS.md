# REST API Conventions

This document defines the structure every backend endpoint in this project follows.
It exists so the frontend team can build against a predictable contract even before
every endpoint is written, and so new endpoints stay consistent as the project grows.

Reference implementation: `POST /api/auth/login`
(`controller/AuthController.java`, `service/AuthService.java`).

---

## 1. Base URL & versioning

- Local dev backend: `http://localhost:8080`
- All endpoints are namespaced under `/api`.
- No version prefix yet (`/api/...`, not `/api/v1/...`). If we ever need breaking
  changes after the frontend depends on v1 behavior, we introduce `/api/v2/...`
  at that point rather than versioning prematurely.

## 2. Resource naming

- Path segments are plural nouns for resources: `/api/roles`, `/api/products`,
  `/api/suppliers`.
- Actions that aren't CRUD on a resource (login, logout, password reset) live
  under a verb-like sub-path instead of forcing them into noun form:
  `/api/auth/login`, `/api/auth/logout`.
- Path variables identify a specific resource: `/api/products/{id}`.
- No trailing slashes. No file extensions in the path.

## 3. HTTP methods

| Method | Use for                                  | Idempotent? |
|--------|-------------------------------------------|-------------|
| GET    | Read one or many resources, no side effects | Yes       |
| POST   | Create a resource, or trigger an action (login, reorder-recommendation run) | No |
| PUT    | Replace a resource fully                  | Yes         |
| PATCH  | Partially update a resource               | No          |
| DELETE | Remove a resource                         | Yes         |

## 4. Response envelope

**Every** response body — success or failure — is a JSON object of this shape:

```json
{
  "success": true,
  "data": { "...": "..." },
  "error": null,
  "timestamp": "2026-09-14T10:15:30Z"
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username/email or password.",
    "details": null
  },
  "timestamp": "2026-09-14T10:15:30Z"
}
```

Implementation: `dto/ApiResponse.java` + `dto/ApiError.java`. Controllers return
`ApiResponse.success(payload)`; `exception/GlobalExceptionHandler.java` is the
only place that builds `ApiResponse.error(...)` — controllers should never build
an error envelope by hand, just throw one of the exceptions in `exception/`
(or a Bean Validation failure) and let the handler translate it.

Fields that are `null` (e.g. `details` when there are no field errors) are
omitted from the JSON entirely (`@JsonInclude(NON_NULL)`), so the frontend
should treat a missing field the same as `null`.

### `error.code` values in use so far

| Code                | HTTP status | Meaning                                   |
|---------------------|-------------|--------------------------------------------|
| `VALIDATION_ERROR`   | 400         | One or more request fields failed `@Valid` validation. `details` is a list of `"field: message"` strings. |
| `MALFORMED_REQUEST`  | 400         | Request body missing or not valid JSON.    |
| `BAD_REQUEST`        | 400         | Generic client error not covered above (includes bad path/query param types). |
| `INVALID_CREDENTIALS`| 401         | Login failed (unknown user or wrong password — deliberately not distinguished, see below). |
| `ACCOUNT_DISABLED`   | 401         | Login attempted on a deactivated account.  |
| `UNAUTHORIZED`       | 401         | Generic auth failure not covered above.    |
| `INTERNAL_ERROR`     | 500         | Unexpected server-side failure.            |

New endpoints that need a new failure reason should add a new `code` to this
table rather than reusing an unrelated one — the frontend is expected to branch
on `code`, not on `message` (message text may be tweaked for wording later).

**Security note:** `INVALID_CREDENTIALS` is used for both "no such user" and
"wrong password" on purpose. Returning a different code/message for each would
let a caller enumerate valid usernames.

## 5. HTTP status codes

| Status | When                                                        |
|--------|-------------------------------------------------------------|
| 200 OK | Successful GET/POST/PUT/PATCH that returns a body            |
| 201 Created | Successful POST that creates a resource (not yet used — no create-resource endpoint exists yet; use for the first one, e.g. `POST /api/products`) |
| 204 No Content | Successful DELETE, or an update with nothing to return |
| 400 Bad Request | Validation error, malformed JSON, bad param type       |
| 401 Unauthorized | Not authenticated / login failed                      |
| 403 Forbidden | Authenticated but not allowed to perform the action (reserved for when RBAC is enforced) |
| 404 Not Found | Resource does not exist                                |
| 500 Internal Server Error | Unexpected server bug                    |

## 6. Request validation

Request DTOs are Java `record`s with `jakarta.validation.constraints` annotations
on the components (e.g. `@NotBlank`). Controllers annotate the parameter with
`@Valid`. `GlobalExceptionHandler` turns any failure into a `VALIDATION_ERROR`
response automatically — controllers and services never check for blank/null
manually for anything already covered by an annotation.

## 7. Auth endpoints implemented so far

| Method | Path              | Auth required | Description |
|--------|-------------------|---------------|--------------|
| POST   | `/api/auth/login` | No            | Authenticates a user, returns profile + a temporary access token. |

See `AUTH_API_TESTING.md` in this folder for request/response examples and a
ready-to-import Postman collection.

### On the `accessToken` field

`LoginResponse.accessToken` is currently a random UUID, **not a JWT**, and no
endpoint validates it yet (there are no protected endpoints yet). It exists so
the frontend can already implement "store the token, send it as
`Authorization: Bearer <token>`" against a stable contract. When real
token-based auth (JWT) is introduced, only the token's format and a new
validation filter change — this response shape does not.

## 8. CORS

Configured in `config/CorsConfig.java`. Allowed origins today:
`http://localhost:3000` and `http://localhost:5173` (Vite's default dev port,
used by `frontend/`). Add any additional dev/staging origin there, not in
individual controllers.
