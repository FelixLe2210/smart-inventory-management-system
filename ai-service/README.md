# 🤖 Smart Inventory AI Service (FastAPI)

FastAPI-based microservice powering AI capabilities for the **Smart Inventory Management System**:
- **Demand Forecasting** (Random Forest / Gradient Boosting with time-series feature engineering)
- **Training Pipeline & Model Registry** (auto-load, validation, persistence, performance metrics)
- **RESTful API** compliant with project response envelopes (`docs/api/API_CONVENTIONS.md`)

## Features

- **Sprint 7 - M4**:
  - `Sprint7-13`: Create Python AI Service (FastAPI, CORS, Lifespan, Health checks, Config)
  - `Sprint7-14`: Create Training Pipeline (lag/rolling features, Random Forest, model persistence in `models/`)
  - `Sprint7-15`: Create Forecast Endpoint Skeleton & implementation (`/api/forecast/demand`, `/api/forecast/product/{id}`, `/api/forecast/train`)
  - `Sprint7-16`: AI Service Testing (Pytest unit & integration test suite)

## Quick Start

### 1. Setup virtual environment and dependencies

```bash
cd ai-service
# Using uv (recommended)
uv venv .venv --python 3.11
uv pip install -r requirements.txt

# Or standard pip
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Service

```bash
# Run via python main.py
python main.py

# Or via uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation: `http://localhost:8000/docs`.

### 3. Run Tests

```bash
pytest
```
