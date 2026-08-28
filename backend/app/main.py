"""FastAPI entry point for the JobMatch AI backend.

In production this one process serves both halves of the project: the API under
/api, and the built React app for everything else. Serving them from the same
origin means the browser makes same origin requests, so there is no CORS to
configure and no second URL to keep in step.

Locally the two are still separate. Vite runs on 5173 and proxies /api to this
server, so the frontend code is identical in both places.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, auth, cv, forecasts, jobs, match
from app.core.config import settings

app = FastAPI(
    title="JobMatch AI API",
    description=(
        "Backend for JobMatch AI, a CV and job matching system with job market "
        "forecasting for the Sri Lankan IT industry."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Each router carries its own /api prefix
app.include_router(auth.router)
app.include_router(cv.router)
app.include_router(match.router)
app.include_router(jobs.router)
app.include_router(forecasts.router)
app.include_router(admin.router)


@app.get("/api", tags=["health"])
def read_root():
    """Identity endpoint used to confirm the API is reachable.

    This used to answer on / and moved here when the React app took over the
    root path.
    """
    return {"app": "JobMatch AI", "status": "ok"}


@app.get("/health", tags=["health"])
def health_check():
    """Liveness probe, also used by the Railway healthcheck."""
    return {"status": "healthy"}


DIST = settings.frontend_dist_path
INDEX = DIST / "index.html"


def _is_inside(candidate: Path, parent: Path) -> bool:
    """True when candidate sits under parent, guarding against ../ traversal."""
    try:
        candidate.relative_to(parent)
    except ValueError:
        return False
    return True


if INDEX.is_file():
    # Hashed build output. These get a long cache life from the file names
    # themselves, so they are safe to serve straight off disk.
    assets = DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str) -> FileResponse:
        """Serve a built file when one matches, otherwise the React shell.

        React Router owns the URL once the page has loaded, so a refresh on
        /profile or /matches/3 arrives here as a real request for a path that
        has no file behind it. Returning index.html lets the router take over.
        Anything under /api that reaches this point is a genuine 404, and must
        not be answered with an HTML page.
        """
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
            )

        if full_path:
            candidate = (DIST / full_path).resolve()
            if candidate.is_file() and _is_inside(candidate, DIST.resolve()):
                return FileResponse(candidate)

        return FileResponse(INDEX)
