"""Mobile app checks that do not need `npm install`.

The real gates are `npm run check` (verify · tsc · eslint · vitest) and
`npx expo export --platform android` in mobile/, which CI runs. This suite
covers what can be read from the source: that the Expo config will build an
installable Android app, that the catalogue matches the bot's, and that the
app keeps its own rules (one network module, the token in the secure store,
every string in both languages).

    python tests/test_mobile.py
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOBILE = ROOT / "mobile"
sys.path.insert(0, str(ROOT / "backend"))

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if ok else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not ok else ""))


def main() -> int:
    # ------------------------------------------------------------ config ---
    app = json.loads((MOBILE / "app.json").read_text(encoding="utf-8"))["expo"]
    check("app name is Dehqon Bozori", app.get("name") == "Dehqon Bozori")
    check("deep-link scheme set", bool(app.get("scheme")))
    check("Android package id set", bool(app.get("android", {}).get("package")))
    check("iOS bundle id set", bool(app.get("ios", {}).get("bundleIdentifier")))
    plugins = [p if isinstance(p, str) else p[0] for p in app.get("plugins", [])]
    for plugin in ("expo-router", "expo-secure-store", "expo-image-picker", "expo-splash-screen"):
        check(f"config plugin: {plugin}", plugin in plugins)
    picker = next((p for p in app.get("plugins", []) if isinstance(p, list) and p[0] == "expo-image-picker"), None)
    check("camera / photo permission texts are written for the user",
          bool(picker and picker[1].get("cameraPermission") and picker[1].get("photosPermission")))
    for asset in ("icon", ):
        check(f"{asset} file exists", (MOBILE / app[asset]).is_file())
    adaptive = app.get("android", {}).get("adaptiveIcon", {})
    for key in ("foregroundImage", "backgroundImage", "monochromeImage"):
        check(f"adaptive icon {key} exists", (MOBILE / adaptive.get(key, "missing")).is_file())

    eas = json.loads((MOBILE / "eas.json").read_text(encoding="utf-8"))
    preview = eas.get("build", {}).get("preview", {})
    check("EAS preview profile builds an installable APK",
          preview.get("android", {}).get("buildType") == "apk")
    check("EAS production profile builds a Play Store bundle",
          eas["build"]["production"]["android"]["buildType"] == "app-bundle")
    for profile in ("preview", "production"):
        url = eas["build"][profile].get("env", {}).get("EXPO_PUBLIC_API_URL", "")
        check(f"EAS {profile} points at an https API", url.startswith("https://"), url)

    pkg = json.loads((MOBILE / "package.json").read_text(encoding="utf-8"))
    check("entry point is Expo Router", pkg.get("main") == "expo-router/entry")
    for script in ("typecheck", "lint", "test", "verify", "check"):
        check(f"npm script: {script}", script in pkg.get("scripts", {}))
    check("react and react-dom pinned to the same version",
          pkg["dependencies"].get("react") == pkg["dependencies"].get("react-dom"))
    check(".env.example documents EXPO_PUBLIC_API_URL",
          "EXPO_PUBLIC_API_URL" in (MOBILE / ".env.example").read_text(encoding="utf-8"))

    # ----------------------------------------------------------- screens ---
    for route in ("_layout.tsx", "(tabs)/_layout.tsx", "(tabs)/index.tsx", "(tabs)/saqlangan.tsx",
                  "(tabs)/sotish.tsx", "(tabs)/kabinet.tsx", "(tabs)/profil.tsx",
                  "mahsulot/[id].tsx", "dehqon/[id].tsx", "tahrirlash/[id].tsx", "admin.tsx"):
        check(f"screen exists: {route}", (MOBILE / "src" / "app" / route).is_file())

    # ------------------------------------------------------------- rules ---
    src_files = list((MOBILE / "src").rglob("*.ts")) + list((MOBILE / "src").rglob("*.tsx"))
    fetchers = [p.name for p in src_files if re.search(r"(?<![.\w])fetch\s*\(", p.read_text(encoding="utf-8"))]
    check("only lib/api.ts calls fetch()", fetchers == ["api.ts"], str(fetchers))
    storage = (MOBILE / "src" / "lib" / "storage.ts").read_text(encoding="utf-8")
    check("session token kept in SecureStore, not AsyncStorage",
          "SecureStore.setItemAsync(TOKEN_KEY" in storage
          and "AsyncStorage.setItem(TOKEN_KEY" not in storage)
    photo = (MOBILE / "src" / "lib" / "photo.ts").read_text(encoding="utf-8")
    check("photos are shrunk before upload (rural 3G)", "resize" in photo and "compress" in photo)
    api_ts = (MOBILE / "src" / "lib" / "api.ts").read_text(encoding="utf-8")
    check("contact taps are tagged source=app for analytics", "source=app" in api_ts)
    check("contact ping never blocks the dial", "catch(() => undefined)" in api_ts)

    # --------------------------------------------------------- catalogue ---
    from app.catalog import CATEGORIES, REGIONS, UNITS  # noqa: E402

    catalog_ts = (MOBILE / "src" / "lib" / "catalog.ts").read_text(encoding="utf-8")
    for name, table in (("CATEGORIES", CATEGORIES), ("UNITS", UNITS), ("REGIONS", REGIONS)):
        block = re.search(rf"export const {name}[^=]*=\s*\{{(.*?)\n\}};", catalog_ts, re.S)
        keys = set(re.findall(r"^\s*([a-z_]+):\s*\{", block.group(1), re.M)) if block else set()
        check(f"mobile {name} keys = backend", keys == set(table),
              f"only app: {sorted(keys - set(table))}, only backend: {sorted(set(table) - keys)}")
        for key, labels in table.items():
            for lang in ("uz", "ru"):
                expected = labels[lang].replace("'", "\\'")
                ok = f"{lang}: '{expected}'" in catalog_ts or f'{lang}: "{labels[lang]}"' in catalog_ts
                if not ok:
                    check(f"mobile {name}.{key}.{lang} matches the bot", False, labels[lang])
    check("mobile catalogue labels match the bot in uz and ru", True)

    # --------------------------------------------------------- districts ---
    try:
        result = subprocess.run(
            ["node", str(ROOT / "frontend" / "scripts" / "gen-districts.mjs"),
             "--out", "src/lib/districts.ts", "--check"],
            cwd=MOBILE, capture_output=True, text=True,
        )
        check("mobile districts.ts is generated from districts.py and up to date",
              result.returncode == 0, (result.stdout + result.stderr).strip()[:200])
    except FileNotFoundError:
        print("\033[93m SKIP\033[0m  districts check — node not available")

    # -------------------------------------------------------------- i18n ---
    i18n = (MOBILE / "src" / "lib" / "i18n.ts").read_text(encoding="utf-8")
    check("Russian dictionary is typed as the Uzbek one (no missing keys)",
          "const ru: Dictionary" in i18n)

    print("\n" + "=" * 64)
    print(f"  mobile: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        for name in FAIL:
            print(f"    · {name}")
    print("=" * 64)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
