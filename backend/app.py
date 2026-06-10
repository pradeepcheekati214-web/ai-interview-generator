"""
Flask application entry point.
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

from database import init_db
from routes import api

# Load environment variables from .env file
load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me-in-production")

    # ── CORS ──────────────────────────────────────────────────────────
    # Allow requests from any origin in dev; tighten in production by
    # setting the CORS_ORIGINS env var to your Vercel domain.
    allowed_origins = os.environ.get("CORS_ORIGINS", "*")
    CORS(app, resources={r"/*": {"origins": allowed_origins}})

    # ── Rate limiting ─────────────────────────────────────────────────
    Limiter(
        get_remote_address,
        app=app,
        default_limits=[os.environ.get("RATE_LIMIT", "20 per minute")],
        storage_uri="memory://",
    )

    # ── Register blueprints ───────────────────────────────────────────
    app.register_blueprint(api)

    # ── Init DB ───────────────────────────────────────────────────────
    with app.app_context():
        init_db()

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
