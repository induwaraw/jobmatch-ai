# JobMatch AI: An AI Powered CV and Job Matching System with Job Market Forecasting for the Sri Lankan IT Industry

**Author:** Induwara Weerarathna (st20298627)
**Programme:** BSc (Hons) Software Engineering, Cardiff Metropolitan University / ICBT

## About

JobMatch AI reads a candidate's CV, extracts the skills it contains, and scores
that CV against IT vacancies advertised in Sri Lanka. Where a skill gap is found
the system suggests learning material to close it. Alongside the matching, the
system forecasts demand six and twelve months ahead for each IT subcategory
(Software Engineering, Data Science, Cyber Security, DevOps, QA and UI/UX) so a
candidate can see which direction the local market is moving in.

## Repository layout

| Folder      | Contents                                                        |
| ----------- | --------------------------------------------------------------- |
| `backend/`  | FastAPI application, SQLAlchemy models and Alembic migrations     |
| `frontend/` | React 18 and Vite single page application                         |
| `ml/`       | Machine learning workspace, trained separately from the backend   |
| `data/`     | Scraped and intermediate data, contents not committed             |
| `docs/`     | Dissertation documents and diagrams                               |

## Technology

- Backend: Python 3.10, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2, Alembic, PyMySQL
- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios, Recharts
- Database: MySQL 8

## Prerequisites

- Python 3.10, available on this machine as `py -3.10`
- Node.js 24 and npm 11
- MySQL 8 running on `localhost:3306` with a database named `jobmatch`

## Running the backend

From the project root, in PowerShell:

```powershell
# 1. Create the virtual environment (first time only)
py -3.10 -m venv backend\.venv

# 2. Activate it
backend\.venv\Scripts\Activate.ps1

# 3. Install dependencies (first time only)
pip install -r backend\requirements.txt

# 4. Create backend\.env from the template at the project root
#    and fill in DATABASE_URL and JWT_SECRET
copy .env.example backend\.env

# 5. Apply the database migrations
cd backend
alembic upgrade head

# 6. Start the API
uvicorn app.main:app --reload
```

The API is then available at http://localhost:8000, and the interactive
documentation at http://localhost:8000/docs.

Quick check:

- `GET http://localhost:8000/` returns `{"app":"JobMatch AI","status":"ok"}`
- `GET http://localhost:8000/health` returns `{"status":"healthy"}`

### Database note

This project targets InnoDB. Some MySQL installations, including the WampServer
build used during development, default to MyISAM, which ignores foreign key
constraints. Every model therefore declares InnoDB explicitly, so the schema is
correct regardless of the server default.

## Running the frontend

In a second terminal, from the project root:

```powershell
cd frontend
npm install     # first time only
npm run dev
```

The application is served at http://localhost:5173 and the backend allows that
origin through CORS.

## Database migrations

After changing anything under `backend/app/models/`:

```powershell
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Machine learning

The ML libraries are deliberately kept out of the backend environment. See
`ml/README.md` and `ml/requirements.txt`.
