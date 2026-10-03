# Dehqon Bozori — API + Telegram bot in one container.
#
# Two stages so pip, its cache and the wheel files never ship to production:
# the runtime image carries only the installed packages, which keeps it small
# and reduces the attack surface.

# --------------------------------------------------------------------------- #
#  Stage 1 — build wheels
# --------------------------------------------------------------------------- #
FROM python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# No apt-get, no compiler: every dependency (asyncpg, greenlet, uvloop,
# pydantic-core…) ships a manylinux wheel for CPython 3.11, and
# --only-binary makes that a guarantee instead of a hope — a dependency that
# would need compiling fails the build loudly rather than pulling in gcc.
WORKDIR /build
COPY requirements.txt .
RUN pip install --prefix=/install --only-binary=:all: -r requirements.txt

# --------------------------------------------------------------------------- #
#  Stage 2 — runtime
# --------------------------------------------------------------------------- #
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ENV=production

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

# Python's own urllib instead of curl, so the image needs no apt packages at
# all. Render uses its own healthCheckPath; this is for `docker run` and any
# other orchestrator.
HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT', '8000'), timeout=8)" || exit 1

CMD ["python", "-m", "app.main"]
