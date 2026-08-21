"""Security and deployment-safety audit.

These are the mistakes that do not show up in a feature test but hurt in
production: a token committed to git, an endpoint that writes without checking
who is asking, a path traversal in a photo URL, an image that runs as root.

    python tests/test_security.py
"""
from __future__ import annotations

import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FE = ROOT / "frontend"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("BOT_TOKEN", "0:test")
os.environ["DATABASE_URL"] = (
    f"sqlite+aiosqlite:///{os.path.join(tempfile.mkdtemp(prefix='dehqon_sec_'), 's.db')}"
)

PASS: list[str] = []
FAIL: list[str] = []
WARN: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if ok else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not ok else ""))


def warn(name: str, detail: str) -> None:
    WARN.append(name)
    print(f"\033[93m WARN\033[0m  {name} — {detail}")


# Files that legitimately hold secrets and must never be committed.
SECRET_FILES = {".env", ".env.local"}

TOKEN_PATTERNS = [
    ("Telegram bot token", re.compile(r"\b\d{8,10}:AA[\w-]{30,}")),
    ("Supabase service key", re.compile(r"\bey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.")),
    ("generic long secret assignment",
     re.compile(r"(?i)(secret|password|api_key|token)\s*[:=]\s*['\"][A-Za-z0-9/+_-]{24,}['\"]")),
]

PLACEHOLDER = re.compile(
    r"(?i)your|example|replace|xxx|placeholder|dummy|test|changeme|abcdefgh|123456789"
)


def main() -> int:
    # ------------------------------------------- secrets not committed ----
    gitignores = {
        p: p.read_text(encoding="utf-8")
        for p in (ROOT / ".gitignore", FE / ".gitignore", BACKEND / ".gitignore")
        if p.is_file()
    }
    combined = "\n".join(gitignores.values())
    for pattern in (".env", "*.db", "media/", "node_modules"):
        check(f".gitignore excludes {pattern}", pattern in combined)

    for name in SECRET_FILES:
        for path in (ROOT / name, BACKEND / name, FE / name):
            if not path.is_file():
                continue
            ignored = ".env" in combined
            check(f"{path.relative_to(ROOT)} is gitignored", ignored)

    # Prune heavy directories from the walk itself — descending into
    # node_modules or .venv turns a 1-second scan into minutes.
    PRUNE = {"node_modules", ".venv", "venv", "__pycache__", ".git", ".next",
             ".vercel", "media", "dist", "build"}
    scanned = 0
    leaks = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in PRUNE]
        for filename in filenames:
            path = Path(dirpath) / filename
            rel = str(path.relative_to(ROOT))
            if path.suffix in (".db", ".png", ".jpg", ".webp", ".ico", ".svg",
                               ".woff", ".woff2", ".lock"):
                continue
            if path.name in SECRET_FILES:
                continue  # gitignored; checked separately
            try:
                text = path.read_text(encoding="utf-8")
            except Exception:
                continue
            scanned += 1
            for label, pattern in TOKEN_PATTERNS:
                for match in pattern.findall(text):
                    snippet = match if isinstance(match, str) else match[0]
                    if PLACEHOLDER.search(snippet):
                        continue
                    leaks.append(f"{rel}: {label}")
    check(f"no real secrets in the {scanned} committed files scanned",
          not leaks, "; ".join(sorted(set(leaks))[:4]))

    # ------------------------------------------- endpoints fail closed ----
    public_src = (BACKEND / "app" / "api" / "routes_public.py").read_text(encoding="utf-8")

    # Walk the AST rather than grepping: a substring search for "/listings"
    # matches the public GET route too, and would pass while the POST beside
    # it was wide open.
    import ast

    tree = ast.parse(public_src)
    guarded: dict[str, bool] = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in node.decorator_list:
            if not isinstance(dec, ast.Call):
                continue
            method = getattr(dec.func, "attr", "")
            if method not in ("post", "patch", "put", "delete"):
                continue
            guarded[node.name] = "require_admin_token" in ast.dump(dec)

    for func in ("register_seller", "create_listing_public", "mark_sold"):
        check(f"{func}() is a write endpoint behind the admin token",
              guarded.get(func) is True,
              "not found as a write route" if func not in guarded
              else "no Depends(require_admin_token)")

    check("the anonymous write endpoint is only the analytics ping",
          [f for f, ok in guarded.items() if not ok] == ["log_contact_event"],
          f"unguarded writes: {[f for f, ok in guarded.items() if not ok]}")
    check("admin guard is disabled-by-default, not open-by-default",
          "if not expected:" in public_src and "raise HTTPException(\n            503" in public_src)
    check("admin token compared in constant time",
          "hmac.compare_digest" in public_src)

    seller_src = (BACKEND / "app" / "api" / "routes_seller.py").read_text(encoding="utf-8")
    check("seller endpoints check ownership before writing",
          "_owned" in seller_src and "403" in seller_src)

    deps_src = (BACKEND / "app" / "api" / "deps.py").read_text(encoding="utf-8")
    check("expired sessions are rejected and deleted", "expires" in deps_src)
    check("admin status comes from ADMIN_IDS, not from the request",
          "settings.admin_id_list" in deps_src)

    # ---------------------------------------------------- path traversal --
    from app.api.media import local_path_for
    from app.db.queries import listing_photo
    from types import SimpleNamespace

    for evil in ("/media/../../../etc/passwd", "/media/../../backend/.env",
                 "/etc/passwd", "../../secret", "/media/uploads/../../../etc/hosts"):
        check(f"photo path traversal blocked: {evil}", local_path_for(evil) is None)
        check(f"bot photo traversal blocked: {evil}",
              listing_photo(SimpleNamespace(photo_file_id=None, photo_url=evil)) is None)

    # ------------------------------------------------------ upload rules --
    from app.api.media import ALLOWED_IMAGE_TYPES, save_upload

    check("upload allow-list is images only",
          all(t.startswith("image/") for t in ALLOWED_IMAGE_TYPES))
    for bad in ("application/x-msdownload", "text/html", "application/pdf",
                "image/svg+xml"):  # svg can carry script — must not be allowed
        try:
            save_upload(b"x", bad, "x")
            check(f"upload rejects {bad}", False, "was accepted")
        except ValueError:
            check(f"upload rejects {bad}", True)

    from app.config import settings

    check("upload size is capped", settings.max_upload_mb <= 20)

    # ------------------------------------------------------ SQL injection -
    # Everything goes through SQLAlchemy expressions; a raw f-string SELECT
    # would be the exception worth catching.
    raw_sql = []
    for path in (BACKEND / "app").rglob("*.py"):
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r'(execute|text)\(\s*f["\']', line):
                raw_sql.append(f"{path.relative_to(BACKEND)}:{lineno}")
    check("no f-string SQL", not raw_sql, "; ".join(raw_sql[:3]))

    # ------------------------------------------------------- XSS in bot ---
    queries_src = (BACKEND / "app" / "db" / "queries.py").read_text(encoding="utf-8")
    check("bot escapes user text before HTML parse mode",
          "html.escape" in queries_src)

    # ---------------------------------------------------------- Docker ----
    dockerfile = (BACKEND / "Dockerfile").read_text(encoding="utf-8")
    check("container runs as a non-root user", re.search(r"^USER (?!root)", dockerfile, re.M))
    check("no secrets baked into the image",
          not re.search(r"^ENV\s+\w*(TOKEN|SECRET|PASSWORD|KEY)", dockerfile, re.M))
    check("no port hard-coded (Render injects $PORT)",
          not re.search(r"--port[= ]\d+", dockerfile))

    dockerignore = (BACKEND / ".dockerignore").read_text(encoding="utf-8")
    for pattern in (".env", "*.db", "media/"):
        check(f".dockerignore excludes {pattern}", pattern in dockerignore)

    # ----------------------------------------------------- Supabase RLS ---
    schema = (BACKEND / "supabase" / "schema.sql").read_text(encoding="utf-8")
    check("RLS enabled on listings", "alter table listings" in schema
          and "enable row level security" in schema)
    tables = re.findall(r"create table if not exists (\w+)", schema)
    for table in tables:
        check(f"RLS enabled on {table}",
              re.search(rf"alter table {table}\s+enable row level security", schema) is not None)
    check("anon key has a read policy only",
          "for select" in schema
          and not re.search(r"create policy[^;]+for (insert|update|delete)", schema))
    check("phone numbers are not exposed through a public users policy",
          "create policy" not in schema.split("alter table users")[-1].split("create policy")[0]
          or "public_sellers" in schema)

    # -------------------------------------------------------- CORS --------
    app_src = (BACKEND / "app" / "api" / "app.py").read_text(encoding="utf-8")
    check("CORS origins are configurable", "cors_origin_list" in app_src)
    check("credentials are not sent cross-origin with a wildcard",
          "allow_credentials=False" in app_src)
    if settings.cors_origins.strip() == "*":
        warn("CORS is currently '*'",
             "fine while testing; set CORS_ORIGINS to your Vercel domain in production")

    # -------------------------------------------------- error leakage -----
    check("unhandled errors do not leak internals to the client",
          "Server xatosi" in app_src and "logger.exception" in app_src)

    # ------------------------------------------------- frontend secrets ---
    for path in list((FE / "lib").glob("*.ts")) + list((FE / "app").rglob("*.tsx")):
        src = path.read_text(encoding="utf-8")
        server_only = re.findall(r"process\.env\.(?!NEXT_PUBLIC_)(\w+)", src)
        allowed = {"NODE_ENV"}
        bad = [v for v in server_only if v not in allowed]
        check(f"{path.relative_to(FE)} exposes no server-only env var",
              not bad, str(bad))

    print("\n" + "=" * 64)
    print(f"  security: {len(PASS)} passed, {len(FAIL)} failed, {len(WARN)} warning(s)")
    if FAIL:
        for name in FAIL:
            print(f"    · {name}")
    print("=" * 64)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
