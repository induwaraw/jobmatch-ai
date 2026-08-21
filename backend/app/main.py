"""FastAPI entry point for the JobMatch AI backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="JobMatch AI API",
    description=(
        "Backend for JobMatch AI, a CV and job matching system with job market "
        "forecasting for the Sri Lankan IT industry."
    ),
    version="0.1.0",
)

# The React development server runs on port 5173
ALLOWED_ORIGINS = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Simple identity endpoint used to confirm the API is reachable."""
    return {"app": "JobMatch AI", "status": "ok"}


@app.get("/health")
def health_check():
    """Liveness probe."""
    return {"status": "healthy"}
