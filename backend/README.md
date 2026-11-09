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

## API Endpoints

- **Root:** [http://localhost:8000/](http://localhost:8000/)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
