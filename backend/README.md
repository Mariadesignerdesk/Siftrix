# Siftrix Backend

FastAPI backend service for Siftrix, an AI-powered phishing and scam detection platform.

---

## Prerequisites
- Python 3.14+
- Virtual environment (`.venv`) at project root

---

## Setup & Installation

1. **Activate the virtual environment** (from project root):
   - **Windows (PowerShell):**
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     .\.venv\Scripts\activate.bat
     ```
   - **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

---

## Running the Server

Start the local development server with auto-reload:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## Database Migrations (Alembic)

Database schema versioning is managed via Alembic.

### Local Migrations
1. Run latest migrations:
   ```bash
   alembic upgrade head
   ```
2. Rollback the most recent migration:
   ```bash
   alembic downgrade -1
   ```

### Railway Production Deployments
Before deploying application code that depends on new database tables (such as `users`), apply pending migrations to the Railway PostgreSQL database:

```bash
railway run alembic upgrade head
```

> **Data Safety Guarantee:** Migration `0001_initial_schema_and_users` checks the database schema dynamically. If the `scans` table already exists, it is preserved completely without dropping or altering existing scan records. It provisions only the missing `users` table and initializes version tracking.

---

## API Endpoints

- **Root:** [http://localhost:8000/](http://localhost:8000/)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
