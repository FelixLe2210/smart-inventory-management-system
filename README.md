# Smart Inventory Management System

A warehouse management system that supports inventory visibility, demand planning, and intelligent replenishment.

## AI Features

- **AI #1: Context-Aware Demand Forecasting**
- **AI #2: Intelligent Reorder Recommendation**

## Technology Stack

- ReactJS
- Java Spring Boot
- MySQL
- Python
- XGBoost
- Random Forest
- Prophet

## Getting Started

### Backend (Spring Boot)

Requires JDK 17+ and a running MySQL instance.

```bash
cd backend
./mvnw spring-boot:run
```

Runs on `http://localhost:8080` with the `dev` profile active by default
(see `application.yml`). Flyway applies migrations automatically on startup;
a demo login user is also seeded (see `docs/api/AUTH_API_TESTING.md`).

Override DB connection via env vars if needed: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

### Frontend (React + Vite)

Requires Node.js 18+.

```bash
cd frontend
npm install
cp .env.example .env.local   # only needed if the backend isn't on localhost:8080
npm run dev
```

Runs on `http://localhost:5173`.

### API documentation

- [`docs/api/API_CONVENTIONS.md`](docs/api/API_CONVENTIONS.md) — response envelope, error codes, HTTP status usage. Read this before adding any new endpoint.
- [`docs/api/AUTH_API_TESTING.md`](docs/api/AUTH_API_TESTING.md) — how to test the login API (curl + Postman collection included).

