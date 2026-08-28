# JobMatch AI, built as a single service.
#
# Stage one builds the React app with Node. Stage two is the Python runtime
# that actually ships: it installs the backend dependencies, copies the built
# frontend in, and serves both from one uvicorn process. The Node toolchain and
# node_modules never reach the final image.

# ---------------------------------------------------------------------------
# Stage 1: build the React frontend
# ---------------------------------------------------------------------------
FROM node:24-slim AS frontend

WORKDIR /build

# Copy the manifests on their own first so this layer is only rebuilt when the
# dependencies change, not on every source edit.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2: Python runtime that serves the API and the built frontend
# ---------------------------------------------------------------------------
FROM python:3.10-slim AS runtime

# Set INSTALL_ML=false to build without torch and transformers. They add close
# to a gigabyte, and they are only worth carrying when CLASSIFIER_MODEL_PATH
# points at a real copy of the trained model. Without one the classifier runs
# in its skill count fallback mode either way.
ARG INSTALL_ML=true

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY backend/requirements.txt backend/requirements-ml.txt ./backend/

RUN pip install --no-cache-dir -r backend/requirements.txt \
 && python -m spacy download en_core_web_sm

# The CPU wheels come from PyTorch's own index. The default PyPI wheel bundles
# CUDA and is several times larger, which is wasted weight on a server with no
# GPU.
RUN if [ "$INSTALL_ML" = "true" ]; then \
      pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        -r backend/requirements-ml.txt ; \
    fi

COPY backend/ ./backend/

# The skills taxonomy lives under ml/ because that is where it was built, and
# the extractor reads it from there at runtime.
COPY ml/skills/ ./ml/skills/

# The default FRONTEND_DIST in the settings resolves to <repo root>/frontend/
# dist, so putting the build here means no environment variable is needed.
COPY --from=frontend /build/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 8000

# Shell form so ${PORT} is expanded at run time. Railway assigns the port and
# passes it in; 8000 is the local default.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
