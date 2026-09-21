#!/usr/bin/env python3
"""Generate sitemap.xml from whatever pages actually exist.

Run by `npm run build`, which `npm run deploy` runs first, so the sitemap cannot
drift from the site the way a hand-maintained one does.

Three decisions worth knowing about:

  * Pages opt OUT, not in. Anything that looks like a routed page is included
    unless it carries a noindex or is on the EXCLUDE list. A new page therefore
    appears in the sitemap by existing, which is the behaviour you want when the
    point is to stop maintaining this by hand.

  * lastmod comes from git, not from the filesystem. A file's mtime changes when
    it is regenerated even if nothing about it changed; the commit date reflects
    when the content actually last moved. Uncommitted edits fall back to today,
    because that edit is about to be deployed.

  * Only <loc> and <lastmod> are emitted. Google has said publicly that it
    ignores <changefreq> and <priority>, and the old hand-written file claimed
    priority 1.0 / 0.3 values that meant nothing. Emitting them invites the
    belief that tuning them does something.
"""
import os
import re
import subprocess
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://uplof.me"

# Not pages, or pages that exist but are deliberately unrouted.
EXCLUDE_DIRS = {".git", "node_modules", ".tools", "functions", "assets", "css", "js", "fonts"}
EXCLUDE_FILES = {
    "404.html",   # error document, never in a sitemap
    "m.html",     # standalone mobile draft, not linked or routed
}


def url_for(relpath):
    """./index.html -> /   ./privacy-policy/index.html -> /privacy-policy/"""
    if relpath == "index.html":
        return "/"
    if relpath.endswith("/index.html"):
        return "/" + relpath[: -len("index.html")]
    return "/" + relpath


def lastmod(path):
    rel = os.path.relpath(path, ROOT)
    try:
        dirty = subprocess.run(["git", "status", "--porcelain", "--", rel],
                               cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if dirty:                      # edited but not committed: it ships today
            return date.today().isoformat()
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel],
                             cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if out:
            return out
    except (OSError, subprocess.SubprocessError):
        pass
    return date.today().isoformat()    # not a git checkout


def collect():
    pages, skipped = [], []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for name in filenames:
            if not name.endswith(".html"):
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT)
            if name in EXCLUDE_FILES:
                skipped.append((rel, "on the exclude list"))
                continue
            head = open(full, encoding="utf-8").read(4000)
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', head, re.I):
                skipped.append((rel, "noindex"))
                continue
            pages.append((url_for(rel), lastmod(full)))
    # homepage first, then alphabetical — stable output, so git diffs stay readable
    pages.sort(key=lambda p: (p[0] != "/", p[0]))
    return pages, sorted(skipped)


def main():
    pages, skipped = collect()
    if not pages:
        sys.exit("refusing to write an empty sitemap")

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in pages:
        lines += ["  <url>",
                  f"    <loc>{BASE}{loc}</loc>",
                  f"    <lastmod>{mod}</lastmod>",
                  "  </url>"]
    lines.append("</urlset>")
    out = "\n".join(lines) + "\n"

    path = os.path.join(ROOT, "sitemap.xml")
    before = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    open(path, "w", encoding="utf-8").write(out)

    print("sitemap.xml: %d page%s%s" % (len(pages), "" if len(pages) == 1 else "s",
                                        "" if out != before else "  (unchanged)"))
    for loc, mod in pages:
        print("  %-42s %s" % (loc, mod))
    if skipped:
        # Printed, not silent: a page vanishing from the sitemap should be a
        # thing you notice at deploy time, not three weeks later in Search Console.
        print("skipped:")
        for rel, why in skipped:
            print("  %-42s %s" % (rel, why))


if __name__ == "__main__":
    main()
