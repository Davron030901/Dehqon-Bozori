# Dehqon Bozori — API + Telegram bot in one container.
#
# Two stages so the compiler toolchain needed to build asyncpg/greenlet wheels
# never ships to production: the runtime image carries only the installed
# packages, which keeps it small and reduces the attack surface.

# --------------------------------------------------------------------------- #
#  Stage 1 — build wheels
# --------------------------------------------------------------------------- #
FROM python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# --------------------------------------------------------------------------- #
#  Stage 2 — runtime
# --------------------------------------------------------------------------- #
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ENV=production

# curl is used by the container HEALTHCHECK below.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

WORKDIR /app
COPY app/ ./app
COPY web/ ./web

# Photos and (in local/SQLite mode) the database live here. On Render, mount a
# persistent disk at /app/media if you are not using Supabase Postgres —
# otherwise the container filesystem is wiped on every deploy.
RUN mkdir -p /app/media/uploads /app/media/telegram

# Run as a non-root user.
RUN useradd --create-home --uid 10001 dehqon \
 && chown -R dehqon:dehqon /app
USER dehqon

# Documentation only — Render injects $PORT at runtime and the app binds to it
# (see app/config.py: bind_port). Never hard-code a port here.
EXPOSE 8000

HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

CMD ["python", "-m", "app.main"]
