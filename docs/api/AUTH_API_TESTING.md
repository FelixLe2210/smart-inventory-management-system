# Testing the Auth API

Covers `POST /api/auth/login`. Envelope shape and error codes are defined in
`API_CONVENTIONS.md` — this file is just concrete requests/responses to test
against, plus the Postman collection in this folder
(`Smart_Inventory_Auth.postman_collection.json`).

## Prerequisites

1. MySQL running and reachable with the credentials in
   `backend/src/main/resources/application-dev.yml` (or override via the
   `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` env vars).
2. Start the backend with the `dev` profile (it's the default —
   see `application.yml`):
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
3. On first startup, Flyway runs `V1__create_users_and_roles.sql` (creates the
   `ADMIN` / `MANAGER` / `STAFF` roles), then `DevDataSeeder` creates one demo
   user:

   | Field    | Value                     |
   |----------|---------------------------|
   | username | `admin`                   |
   | email    | `admin@smartinventory.local` |
   | password | `Admin@123`               |
   | role     | `ADMIN`                   |

   This seeding only runs when `spring.profiles.active=dev` and only if the
   `admin` user doesn't already exist — safe to restart the app repeatedly.

## Importing into Postman

Import `Smart_Inventory_Auth.postman_collection.json` from this folder. It has
a collection variable `baseUrl` set to `http://localhost:8080/api` — change it
if your backend runs elsewhere. It includes all four cases below as separate
requests.

## Case 1 — successful login

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin", "password": "Admin@123"}'
```

Expected: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@smartinventory.local",
    "roles": ["ADMIN"],
    "accessToken": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  },
  "error": null,
  "timestamp": "2026-09-14T10:15:30Z"
}
```

Logging in with the email instead of the username works the same way:
`"usernameOrEmail": "admin@smartinventory.local"`.

## Case 2 — wrong password

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin", "password": "wrong-password"}'
```

Expected: `401 Unauthorized`

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username/email or password."
  },
  "timestamp": "2026-09-14T10:15:30Z"
}
```

## Case 3 — unknown user

Same request shape as Case 2 but with a `usernameOrEmail` that doesn't exist.
Expected: identical `401` response with the same `INVALID_CREDENTIALS` code —
this is intentional (see the security note in `API_CONVENTIONS.md`), not a bug.

## Case 4 — missing fields (validation error)

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": ""}'
```

Expected: `400 Bad Request`

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      "usernameOrEmail: Username or email is required",
      "password: Password is required"
    ]
  },
  "timestamp": "2026-09-14T10:15:30Z"
}
```

## Case 5 — malformed JSON body

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d 'not json'
```

Expected: `400 Bad Request` with `error.code = "MALFORMED_REQUEST"`.

## Case 6 — disabled account

Not reproducible with the seeded demo user (it's active by default). To test:
set `is_active = 0` for a user row directly in MySQL, then attempt login with
correct credentials. Expected: `401 Unauthorized` with
`error.code = "ACCOUNT_DISABLED"`.

## Frontend manual check

With the backend running, from `frontend/`:

```bash
npm install
cp .env.example .env.local   # only needed if backend isn't on localhost:8080
npm run dev
```

Open `http://localhost:5173/login`, submit `admin` / `Admin@123`, and confirm
the page shows the logged-in user's username/email/roles. Submitting a wrong
password should show the same `Invalid username/email or password.` message
inline. Stopping the backend and submitting again should show
"Unable to reach the server..." — that's the network-error path in
`frontend/src/api/httpClient.js`, not a crash.
