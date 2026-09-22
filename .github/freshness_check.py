"""Fail if slatestats.com has stopped being rebuilt, or has stopped serving.

Two different failures, and neither shows up as an error anywhere else:

  NOT SERVED   the build box pushes to git and reports success, so anything
               wrong downstream of that push is invisible to it.
  NOT REBUILT  a pipeline that stops leaves the last good site in place. The
               only evidence is a timestamp that quietly ages.

Run from GitHub Actions on a schedule; a non-zero exit emails the owner.
"""
import datetime
import json
import sys
import urllib.request

SITE = "https://slatestats.com"
MAX_AGE_HOURS = 5.0          # deploy windows are at most ~41h apart, but each
                             # run of this check sits ~2h after one of them,
                             # so a single missed window is caught.
PATHS = ["/", "/sitemap.xml", "/robots.txt", "/nfl/players/", "/assets/site.css"]


def get(path, timeout=30):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "slatestats-freshness"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def main() -> int:
    problems = []

    for p in PATHS:
        try:
            code, _ = get(p)
            if code != 200:
                problems.append(f"{p} returned HTTP {code}")
            else:
                print(f"ok   {p}")
        except Exception as e:                      # noqa: BLE001
            problems.append(f"{p} failed: {type(e).__name__}: {e}")

    try:
        _, body = get("/data/manifest.json")
        m = json.loads(body)
        gen = datetime.datetime.fromisoformat(m["generated"])
        if gen.tzinfo is None:
            gen = gen.replace(tzinfo=datetime.timezone.utc)
        age = (datetime.datetime.now(datetime.timezone.utc) - gen).total_seconds() / 3600
        print(f"built {m.get('season')} week {m.get('week')} at {gen.isoformat()} "
              f"({age:.1f}h ago), {m.get('scenarios')} scenarios")
        if age > MAX_AGE_HOURS:
            problems.append(f"last build was {age:.1f}h ago, over the "
                            f"{MAX_AGE_HOURS}h limit -- a deploy window was missed")
        # A build that RUNS and produces nothing passes every freshness test
        # on its own, so the count is checked too.
        if not m.get("scenarios"):
            problems.append("manifest reports zero scenarios")
    except Exception as e:                          # noqa: BLE001
        problems.append(f"manifest.json unusable: {type(e).__name__}: {e}")

    for p in problems:
        print(f"::error::{p}")
    if problems:
        print(f"\n{len(problems)} problem(s). Check the build box: "
              f"/var/log/slatestats/history.log")
        return 1
    print("\nsite is served and current")
    return 0


if __name__ == "__main__":
    sys.exit(main())
