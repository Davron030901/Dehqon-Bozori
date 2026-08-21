"""Frontend checks that do not need `npm install`.

`npm run build` is the real gate and nothing here replaces it. But a full
install is ~300 MB, so this covers what can be verified from the source alone
and catches the mistakes that actually happen: invalid config, a component
reaching past the data layer, a Tailwind class that was never defined, a
hard-coded string that breaks the i18n plan.

    python tests/test_frontend.py
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FE = ROOT / "frontend"

PASS: list[str] = []
FAIL: list[str] = []
SKIP: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if ok else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not ok else ""))


def skip(name: str, why: str) -> None:
    SKIP.append(name)
    print(f"\033[93m SKIP\033[0m  {name} — {why}")


def have_node() -> bool:
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
        return True
    except Exception:
        return False


def main() -> int:
    # ------------------------------------------------------- config -------
    for name in ("package.json", "tsconfig.json", ".eslintrc.json",
                 "public/manifest.webmanifest"):
        path = FE / name
        try:
            json.loads(path.read_text(encoding="utf-8"))
            check(f"{name} is valid JSON", True)
        except Exception as exc:
            check(f"{name} is valid JSON", False, str(exc))

    pkg = json.loads((FE / "package.json").read_text(encoding="utf-8"))
    check("Next.js 14+", int(pkg["dependencies"]["next"].lstrip("^~").split(".")[0]) >= 14)
    check("no custom server (Vercel needs the standard build)",
          pkg["scripts"]["start"] == "next start" and pkg["scripts"]["build"] == "next build")
    check("lucide-react is a dependency", "lucide-react" in pkg["dependencies"])
    check("typecheck script exists", "typecheck" in pkg["scripts"])

    # ------------------------------------------------- JS syntax ---------
    if have_node():
        for name in ("next.config.js", "postcss.config.js", "public/sw.js"):
            result = subprocess.run(["node", "--check", str(FE / name)],
                                    capture_output=True, text=True)
            check(f"{name} parses", result.returncode == 0,
                  result.stderr.strip().splitlines()[-1] if result.stderr else "")
    else:
        skip("JavaScript syntax checks", "node not available")

    # ------------------------------------------------- TypeScript --------
    if (FE / "node_modules" / "typescript").is_dir():
        result = subprocess.run(["npm", "run", "--silent", "typecheck"],
                                cwd=FE, capture_output=True, text=True)
        check("tsc --noEmit passes", result.returncode == 0,
              (result.stdout + result.stderr).strip()[:400])
    else:
        skip("tsc --noEmit", "run `npm install` in frontend/ first")

    # --------------------------------------------- required files --------
    required = [
        "app/layout.tsx", "app/page.tsx", "app/mahsulot/[id]/page.tsx",
        "app/sotuvchi/royxatdan-otish/page.tsx", "app/sotuvchi/elon-qoshish/page.tsx",
        "app/sotuvchi/kabinet/page.tsx", "app/sotuvchi/admin/page.tsx",
        "components/Header.tsx", "components/SearchBar.tsx", "components/CategoryChips.tsx",
        "components/FilterBar.tsx", "components/ProductCard.tsx", "components/ProductGrid.tsx",
        "components/ContactButtons.tsx", "components/Footer.tsx", "components/Badge.tsx",
        "components/AutoRefresh.tsx",
        "lib/mockData.ts", "lib/types.ts", "lib/strings.ts", "lib/api.ts",
        "lib/districts.ts",
        ".env.local.example", "public/manifest.webmanifest", "public/icon.svg",
        "scripts/verify.mjs", "scripts/gen-districts.mjs",
    ]
    for name in required:
        check(f"exists: {name}", (FE / name).is_file())

    # The admin page must not decide admin status for itself — that answer only
    # counts if it came from the backend, which re-checks it on every request.
    admin_src = (FE / "app" / "sotuvchi" / "admin" / "page.tsx").read_text(encoding="utf-8")
    check("admin page asks the backend who is an admin",
          "getSession" in admin_src and "isAdmin" in admin_src)

    # Districts are a list everywhere, never a text box. Free text is how the
    # same place ended up stored as "Urgut", "urgut tumani" and "Urgut t.".
    for form in ("sotuvchi/elon-qoshish", "sotuvchi/royxatdan-otish", "sotuvchi/admin"):
        src = (FE / "app" / form / "page.tsx").read_text(encoding="utf-8")
        check(f"{form}: district is a select, not free text", "districtsOf" in src)
        check(f"{form}: changing region clears the district", "changeRegion" in src)

    # Auto-refresh must not run in a hidden tab — that is data a buyer on a
    # village 3G plan pays for and never sees.
    refresh_src = (FE / "components" / "AutoRefresh.tsx").read_text(encoding="utf-8")
    check("auto-refresh skips hidden tabs", "document.hidden" in refresh_src)
    check("auto-refresh skips offline", "onLine" in refresh_src)
    check("homepage mounts auto-refresh",
          "AutoRefresh" in (FE / "app" / "page.tsx").read_text(encoding="utf-8"))

    # lib/districts.ts is generated; a hand-edit would be silently overwritten.
    districts_ts = (FE / "lib" / "districts.ts").read_text(encoding="utf-8")
    check("generated district file says it is generated",
          "GENERATED FILE" in districts_ts)
    check("district catalogue covers all 14 regions",
          len(re.findall(r"^  [a-z_]+: \[", districts_ts, re.M)) == 14)

    # --------------------------------------------- data layer rule -------
    # The whole point of lib/api.ts is that swapping the backend touches one
    # file. A component importing mockData or calling fetch breaks that.
    for path in list((FE / "components").glob("*.tsx")) + list((FE / "app").rglob("*.tsx")):
        src = path.read_text(encoding="utf-8")
        rel = path.relative_to(FE)
        check(f"{rel} does not import mockData", "mockData" not in src)
        check(f"{rel} does not call fetch() directly",
              not re.search(r"\bfetch\(", src) or "sendBeacon" in src,
              "should go through lib/api.ts")

    # ----------------------------------------------- Tailwind config -----
    tw = (FE / "tailwind.config.ts").read_text(encoding="utf-8")
    check("primary colour is #1D9E75", "#1D9E75" in tw)
    for folder in ("app", "components", "lib"):
        check(f"tailwind scans {folder}/", f"./{folder}/**" in tw)

    shades = {
        "primary": {"DEFAULT", *(str(n) for n in (50, 100, 200, 300, 400, 500, 600, 700, 800, 900))},
        "sand": {"DEFAULT", "100", "200", "300"},
        "ink": {"DEFAULT"}, "muted": {"DEFAULT"}, "harvest": {"DEFAULT"},
    }
    prefix = (r"(?:bg|text|border|ring|ring-offset|from|to|via|fill|stroke|"
              r"divide|outline|placeholder|accent|caret|shadow)")
    pattern = re.compile(rf"{prefix}-([a-z]+)(?:-(\d{{2,3}}))?$")
    missing = set()
    for path in list(FE.rglob("*.tsx")) + [FE / "app" / "globals.css"]:
        if "node_modules" in str(path):
            continue
        text = path.read_text(encoding="utf-8")
        tokens = re.findall(r'class(?:Name)?="([^"]+)"', text) + re.findall(r"@apply ([^;]+);", text)
        for group in tokens:
            for token in group.split():
                token = token.split(":")[-1].split("/")[0]
                m = pattern.fullmatch(token)
                if not m:
                    continue
                root, shade = m.group(1), m.group(2)
                if root in shades and (shade or "DEFAULT") not in shades[root]:
                    missing.add(f"{root}-{shade}")
    check("every custom Tailwind colour used is defined",
          not missing, str(sorted(missing)))

    # --------------------------------------------------- i18n rule -------
    # Uzbek text belongs in lib/strings.ts so Russian can be added later
    # without touching a single component.
    uzbek = re.compile(r"[‘’]|o['‘’]|g['‘’]")
    offenders = []
    for path in list((FE / "components").glob("*.tsx")) + list((FE / "app").rglob("*.tsx")):
        src = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(src.splitlines(), 1):
            for literal in re.findall(r'"([^"]{6,})"|>([^<>{}\n]{6,})<', line):
                text = (literal[0] or literal[1]).strip()
                if not text or text.startswith(("http", "/", "@", "#")):
                    continue
                if "className" in line or "aria-" in line or "sizes" in line:
                    continue
                if uzbek.search(text):
                    offenders.append(f"{path.relative_to(FE)}:{lineno} {text[:40]!r}")
    check("no Uzbek text hard-coded in components",
          not offenders, "; ".join(offenders[:3]))

    # ----------------------------------------------- mock data quality ---
    mock = (FE / "lib" / "mockData.ts").read_text(encoding="utf-8")
    ids = re.findall(r"id: '([^']+)'", mock)
    listing_ids = [i for i in ids if i.startswith("demo-") and not i.startswith("demo-s")]
    check(f"at least 10 demo listings ({len(listing_ids)})", len(listing_ids) >= 10)
    check("demo listing ids are unique", len(listing_ids) == len(set(listing_ids)))
    check("demo data spans several categories",
          len(set(re.findall(r"category: '([a-z_]+)'", mock))) >= 5)
    check("demo data spans several regions",
          len(set(re.findall(r"region: '([a-z_]+)'", mock))) >= 3)
    check("some demo listings are from today", "daysAgo(0" in mock)
    check("a sold-out listing is included", "isSoldOut: true" in mock)
    check("every demo listing has at least one contact channel",
          mock.count("phone:") >= len(listing_ids))

    # demo categories must be ones the UI can label
    types_ts = (FE / "lib" / "types.ts").read_text(encoding="utf-8")
    union = set(re.findall(r"\|?\s*'([a-z_]+)'", types_ts.split("ListingCategory")[0]))
    strings_ts = (FE / "lib" / "strings.ts").read_text(encoding="utf-8")
    labelled = set(re.findall(r"^\s{2}(\w+): \{ label:", strings_ts, re.M))
    used = set(re.findall(r"category: '([a-z_]+)'", mock))
    check("every demo category has a label",
          used <= labelled, f"unlabelled: {sorted(used - labelled)}")

    # --------------------------------------------------- PWA -------------
    manifest = json.loads((FE / "public" / "manifest.webmanifest").read_text(encoding="utf-8"))
    for field in ("name", "start_url", "display", "theme_color", "icons"):
        check(f"manifest has {field}", field in manifest)
    check("manifest theme colour matches the brand", manifest["theme_color"] == "#1D9E75")
    check("manifest icons are non-empty", len(manifest["icons"]) > 0)
    for icon in manifest["icons"]:
        check(f"manifest icon exists: {icon['src']}",
              (FE / "public" / icon["src"].lstrip("/")).is_file())

    sw = (FE / "public" / "sw.js").read_text(encoding="utf-8")
    check("service worker never caches auth traffic", "/api/auth" in sw)
    check("service worker never caches seller data", "/api/my" in sw)

    # --------------------------------------------- env / secrets ---------
    env_example = (FE / ".env.local.example").read_text(encoding="utf-8")
    check("env example only documents NEXT_PUBLIC_* vars",
          all(line.split("=")[0].startswith(("NEXT_PUBLIC_", "#"))
              for line in env_example.splitlines() if "=" in line and not line.startswith("#")))
    check("no real .env.local committed", not (FE / ".env.local").exists())
    check(".gitignore excludes env files", ".env*.local" in
          (FE / ".gitignore").read_text(encoding="utf-8"))

    print("\n" + "=" * 64)
    print(f"  frontend: {len(PASS)} passed, {len(FAIL)} failed, {len(SKIP)} skipped")
    if FAIL:
        for name in FAIL:
            print(f"    · {name}")
    print("=" * 64)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
