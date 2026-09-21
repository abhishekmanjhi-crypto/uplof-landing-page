#!/bin/bash
# Publishes any article whose publishDate has arrived.
#
# This exists because the GitHub Actions version needs the `workflow` OAuth
# scope and a Cloudflare API token, and both have to be created by hand. This
# runs on Abhishek's Mac instead, using the wrangler login that is already
# there, so it needs no new credentials at all.
#
# Trade-off: it only fires while the Mac is awake. If the machine is asleep at
# the scheduled time, launchd runs it at the next wake instead, so a scheduled
# article appears a little late rather than not at all. If that ever matters,
# switch to .tools/publish-workflow.yml, which runs on GitHub's machines.
set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="/Users/abhishek/Downloads/uplof-landing-page"
LOG="$REPO/.tools/scheduled-publish.log"

cd "$REPO"
echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') ===" >> "$LOG"

# Pick up anything the CMS committed since the last run.
git pull --rebase --quiet origin main >> "$LOG" 2>&1 || {
  echo "  git pull failed, continuing with local state" >> "$LOG"
}

# Nothing is deployed unless the build passes, so a scheduled article that
# breaks a content rule leaves the live site exactly as it was.
if ! npm run build >> "$LOG" 2>&1; then
  echo "  BUILD FAILED — nothing deployed" >> "$LOG"
  exit 1
fi

# Only deploy when the build actually produced a change. Otherwise this would
# create a fresh Cloudflare deployment twice a day forever, for nothing.
if [ -z "$(git status --porcelain)" ]; then
  echo "  no changes, nothing due" >> "$LOG"
  exit 0
fi

echo "  changes found, deploying" >> "$LOG"
npx wrangler pages deploy . --branch main --commit-dirty=true >> "$LOG" 2>&1

git add -A
git commit -q -m "Publish scheduled content ($(date '+%Y-%m-%d'))" >> "$LOG" 2>&1
git push --quiet origin main >> "$LOG" 2>&1 || echo "  push failed" >> "$LOG"
echo "  done" >> "$LOG"
