#!/usr/bin/env python3
"""Run every test in the project and print one report.

    python test_all.py              # everything
    python test_all.py backend      # one suite: backend | contract | bot |
                                    #            frontend | security

Suites
------
backend   92 end-to-end checks — the bot's data layer and the API against a
          throwaway database, including that each surface sees the other's writes
contract  the API's JSON shape against the fields frontend/lib/api.ts actually
          reads, parsed out of the real TypeScript
bot       routers, FSM states, and that every string exists in Uzbek AND Russian
frontend  config validity, the data-layer rule, Tailwind classes, PWA manifest
security  committed secrets, auth on write endpoints, path traversal, Docker,
          Supabase RLS

What this does NOT cover — run these yourself before shipping:
  * `cd frontend && npm run build`  — the real Vercel gate
  * `cd backend && docker build .`  — the real Render gate
  * a live Telegram conversation with the bot
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TESTS = ROOT / "tests"

GREEN, RED, YELLOW, DIM, BOLD, RESET = (
    "\033[92m", "\033[91m", "\033[93m", "\033[2m", "\033[1m", "\033[0m"
)

SUITES = [
    ("backend",  ROOT / "backend" / "test_platform.py", ROOT / "backend",
     "API + bot end-to-end, one shared database"),
    ("contract", TESTS / "test_contract.py", ROOT,
     "API JSON shape vs. what the frontend reads"),
    ("bot",      TESTS / "test_bot.py", ROOT,
     "routers, FSM flow, uz/ru translation parity"),
    ("frontend", TESTS / "test_frontend.py", ROOT,
     "config, data-layer rule, Tailwind, PWA"),
    ("security", TESTS / "test_security.py", ROOT,
     "secrets, authz, traversal, Docker, RLS"),
]


def run(name: str, script: Path, cwd: Path, blurb: str) -> tuple[bool, str, float]:
    print(f"\n{BOLD}━━━ {name} {RESET}{DIM}— {blurb}{RESET}")
    if not script.is_file():
        print(f"{RED} missing:{RESET} {script}")
        return False, "missing", 0.0

    env = dict(os.environ)
    env["PYTHONPATH"] = os.pathsep.join(
        filter(None, [str(ROOT / "backend"), env.get("PYTHONPATH", "")])
    )

    started = time.time()
    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=cwd, env=env, capture_output=True, text=True,
    )
    elapsed = time.time() - started
    output = result.stdout + result.stderr

    # Echo the tail: failures, notes and the summary line.
    for line in output.splitlines():
        if any(token in line for token in ("FAIL", "WARN", "NOTE", "SKIP", "passed,", "·")):
            print("  " + line)

    if result.returncode != 0 and "passed," not in output:
        print(f"{RED}  crashed:{RESET}")
        for line in output.strip().splitlines()[-12:]:
            print("    " + line)

    summary = next(
        (l.strip() for l in reversed(output.splitlines()) if "passed," in l),
        "no summary",
    )
    return result.returncode == 0, summary, elapsed


def main() -> int:
    wanted = sys.argv[1] if len(sys.argv) > 1 else None
    suites = [s for s in SUITES if wanted in (None, s[0])]
    if not suites:
        print(f"unknown suite: {wanted}\navailable: {', '.join(s[0] for s in SUITES)}")
        return 2

    print(f"{BOLD}Dehqon Bozori — full project test{RESET}")
    print(f"{DIM}{ROOT}{RESET}")

    results = []
    for name, script, cwd, blurb in suites:
        ok, summary, elapsed = run(name, script, cwd, blurb)
        results.append((name, ok, summary, elapsed))

    print(f"\n{BOLD}{'═' * 68}{RESET}")
    total_ok = True
    for name, ok, summary, elapsed in results:
        mark = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        print(f"  {mark}  {name:<9} {summary:<42} {DIM}{elapsed:5.1f}s{RESET}")
        total_ok &= ok
    print(f"{BOLD}{'═' * 68}{RESET}")

    if total_ok:
        print(f"{GREEN}{BOLD}  All suites passed.{RESET}")
        print(f"{DIM}  Still to run manually: `npm run build` in frontend/, "
              f"`docker build .` in backend/.{RESET}")
    else:
        print(f"{RED}{BOLD}  Some suites failed — see above.{RESET}")
    return 0 if total_ok else 1


if __name__ == "__main__":
    sys.exit(main())
