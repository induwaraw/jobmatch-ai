"""Application configuration.

Values are read from real environment variables first, then from backend/.env.
That order is what makes the same code work in both places: on Railway the
platform injects DATABASE_URL and JWT_SECRET as environment variables, and on
my machine the gitignored backend/.env supplies them instead. No credential
ever needs to live in a tracked file.

The two secrets have no default, so a missing key fails at start up rather than
handing out tokens signed with something predictable.
"""

from pathlib import Path
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[2] is the backend/ directory
BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
ENV_FILE = BACKEND_DIR / ".env"

# Hosts that are on this machine, where an encrypted connection buys nothing
LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1", ""}

# Debian ships the system trust store here, and the runtime image is Debian
DEFAULT_CA_BUNDLE = "/etc/ssl/certs/ca-certificates.crt"


class Settings(BaseSettings):
    """Values loaded from the environment or backend/.env."""

    # SQLAlchemy connection string. Managed MySQL providers hand out a plain
    # mysql:// URL, which SQLAlchemy cannot use on its own, so sqlalchemy_url
    # below rewrites the scheme rather than expecting the value to be edited.
    DATABASE_URL: str

    # Secret used to sign JWT access tokens
    JWT_SECRET: str

    # Signing algorithm for the access tokens
    JWT_ALGORITHM: str = "HS256"

    # How long an access token stays valid, in minutes. 60 minutes is long
    # enough to work with comfortably and short enough to limit a leaked token.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # The curated skills taxonomy. It lives under ml/ because that is where it
    # was built, and it stays the single copy.
    SKILLS_TAXONOMY_PATH: str = str(
        REPO_ROOT / "ml" / "skills" / "skills_taxonomy.json"
    )

    # Folder holding the trained DistilBERT subcategory classifier. The model
    # is not in the repository, so this is empty until a local copy exists.
    # When it is empty the matcher runs in fallback mode instead.
    CLASSIFIER_MODEL_PATH: str = ""

    # Where the built React app lives. In the container the Dockerfile copies
    # the Vite output here; locally this points at frontend/dist if it exists.
    FRONTEND_DIST: str = str(REPO_ROOT / "frontend" / "dist")

    # Browser origins allowed to call the API, comma separated. Once the
    # frontend is served by this same app the requests are same origin and no
    # longer need CORS at all, but the Vite dev server on 5173 still does.
    CORS_ORIGINS: str = "http://localhost:5173"

    # auto     let PyMySQL negotiate TLS and carry on if the server has none
    # require  insist on TLS and verify the certificate against the CA bundle
    # disable  never use TLS
    DB_SSL: str = "auto"
    DB_SSL_CA: str = DEFAULT_CA_BUNDLE

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def sqlalchemy_url(self) -> str:
        """DATABASE_URL in the form SQLAlchemy expects.

        Railway and most managed MySQL providers give out mysql://... which
        SQLAlchemy rejects because it names no driver. PyMySQL is the driver
        this project uses, so the scheme is rewritten to say so.
        """
        url = self.DATABASE_URL.strip()
        if url.startswith("mysql://"):
            url = f"mysql+pymysql://{url[len('mysql://'):]}"
        return url

    @property
    def db_host(self) -> str:
        return urlsplit(self.sqlalchemy_url).hostname or ""

    @property
    def db_connect_args(self) -> dict:
        """Driver level arguments, which is where the TLS decision lands.

        PyMySQL already tries TLS on its own and falls back quietly when the
        server does not offer it, so "auto" deliberately passes nothing. That
        covers the normal managed database case. "require" is the stricter
        setting: it fails the connection rather than continuing unencrypted.
        """
        mode = (self.DB_SSL or "auto").strip().lower()

        if mode in {"disable", "disabled", "false", "off", "0"}:
            return {"ssl_disabled": True}

        if mode in {"require", "required", "true", "on", "1"}:
            args: dict = {"ssl_verify_cert": True, "ssl_verify_identity": True}
            ca = (self.DB_SSL_CA or "").strip()
            if ca and Path(ca).exists():
                args["ssl_ca"] = ca
            return args

        # auto, the default. PyMySQL handles both the local server, which
        # offers no TLS, and a managed one that does.
        return {}

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]

    @property
    def frontend_dist_path(self) -> Path:
        return Path(self.FRONTEND_DIST)


# Single shared instance imported across the application
settings = Settings()
