# CMS setup — the one part that needs you

Everything else is built. This is the GitHub OAuth app, which can only be created
from your own account, and the Worker that uses it.

About ten minutes, once.

---

## What was built, and why there is no Astro

The original plan was to migrate the whole site to Astro. You asked whether we
could avoid that, and you were right to.

The site is six pages of hand-written HTML on a design system that already works,
plus a Python generator that already produces perfect pages. Migrating all of
that would have been a couple of days of risk to gain a markdown pipeline and
image optimisation — and `.tools/build-content.mjs` does both in one file, with
`sharp` doing exactly the image work Astro would have done.

So nothing was migrated. The existing pages are untouched.

```
content/insights/*.md        you write here (or the CMS writes here)
content/uploads/*            original images, any size
        ↓  npm run build
insights/<slug>/index.html   generated pages, same design system
assets/insights/*.webp       480 / 900 / 1400px WebP, srcset wired up
sitemap.xml                  updated automatically
```

---

## Step 1 — Deploy the auth Worker

Sveltia needs a tiny Cloudflare Worker to complete the GitHub login handshake.
The Sveltia project publishes one; it is open source and you deploy your own copy.

1. Go to **https://github.com/sveltia/sveltia-cms-auth**
2. Click **Deploy to Cloudflare Workers** (or clone and `npx wrangler deploy`)
3. When it finishes, copy the Worker URL. It looks like
   `https://sveltia-cms-auth.<your-subdomain>.workers.dev`

---

## Step 2 — Create the GitHub OAuth app

This is the part only you can do.

1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**
2. Fill in:

   | Field | Value |
   |---|---|
   | Application name | `Uplof CMS` |
   | Homepage URL | `https://uplof.me` |
   | Authorization callback URL | `<your Worker URL>/callback` |

3. Click **Register application**
4. Copy the **Client ID**
5. Click **Generate a new client secret** and copy it immediately — GitHub shows
   it once

> Sign in with the account that owns the repo: **abhishekmanjhi-crypto**.

---

## Step 3 — Give the Worker the credentials

In the Cloudflare dashboard → **Workers & Pages** → your `sveltia-cms-auth`
Worker → **Settings** → **Variables and Secrets**, add two **secrets**:

| Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | the Client ID from step 2 |
| `GITHUB_CLIENT_SECRET` | the Client Secret from step 2 |

Add them as **secrets**, not plain variables, so they are write-only.

**Do not put either of these in this file, the repo, or any document.** They go
in Cloudflare and in your password manager, nowhere else.

---

## Step 4 — Point the CMS at the Worker

In `admin/config.yml`, change one line:

```yaml
base_url: https://uplof-cms-auth.REPLACE-ME.workers.dev
```

to your actual Worker URL. Then:

```bash
npm run deploy
```

---

## Step 5 — Log in

Go to **https://uplof.me/admin/** and sign in with GitHub.

You should see the Insights collection, and **New Insight** should give you a
form with every field from the content guide, each with a hint explaining it.

---

## How writing works from then on

1. Open `/admin/`, click **New Insight**
2. Fill the fields. Drag in images at whatever size they are — a 3MB phone photo
   is fine, the build resizes it
3. Leave **Draft** ticked while you work. Drafts are skipped by the build
4. Untick Draft and save. Sveltia commits the markdown to `main`
5. Run `npm run deploy`

### What the build refuses to publish

This is the part that makes the checklist real. The build **fails and writes
nothing** if an article breaks any of these:

- meta description outside 140–160 characters
- short answer outside 50–80 words
- fewer than two links to other Uplof pages, in the prose
- an image with no alt text, or with empty alt text
- a heading that skips a level
- fewer than two related pages
- a referenced image that does not exist
- any required field missing

Every message names the file and the rule. Nothing half-finished reaches the site.

---

## Things worth knowing

- **Images stay in the repo at full size.** `content/uploads/` keeps the
  originals; visitors only ever get the WebP versions from `assets/insights/`.
  So a 3MB file in git with a 60KB file on the site is working correctly.
- **The repo grows.** At a fortnightly article that is maybe 50MB a year. Fine.
  If it ever becomes a problem, a GitHub Action can downsize originals on push —
  a local hook cannot, because Sveltia commits through GitHub's API and never
  touches your machine.
- **Sveltia is a drop-in replacement for Decap CMS**, so `admin/config.yml` is
  portable if this project is ever abandoned.
- **Content is plain markdown in your repo.** If the CMS disappears tomorrow,
  every article is still there, still readable, still buildable.
- **`/admin/` is noindexed**, and the sitemap generator reads that tag, so it
  excludes itself automatically. Nothing about it is hardcoded.

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| Login loops or fails | Callback URL in the GitHub app does not exactly match `<Worker URL>/callback` |
| "Failed to authenticate" | The two secrets are missing or misspelled in the Worker |
| Saves but nothing appears on the site | You did not run `npm run deploy`, or the article is still a Draft |
| Build fails after saving | Read the messages — each names the file and the rule it broke |
| Images look huge in the repo | Correct. Check `assets/insights/` for what is actually served |

---

## Step 6 — Scheduled publishing (optional, 5 minutes)

Write something today, have it appear on a date you choose. The build already
skips articles dated in the future; this is what comes back later and builds
again.

### Give GitHub permission to deploy

1. **Cloudflare API token.** Cloudflare dashboard → My Profile → API Tokens →
   **Create Token** → use the **Edit Cloudflare Workers** template, or a custom
   token with `Account → Cloudflare Pages → Edit`. Copy it.
2. **Account ID.** On any Cloudflare dashboard page, right-hand sidebar.
3. In GitHub → your repo → **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret**, add both:

   | Name | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | the token from step 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | the ID from step 2 |

### Activate the workflow

The workflow file is in the repo at `.tools/publish-workflow.yml`, **not** yet at
`.github/workflows/publish.yml`. GitHub refuses a push that adds a workflow file
unless the token has the `workflow` scope, and the token on this machine does not.

Pick whichever is easier:

**Option A — grant the scope once, then move the file:**

```bash
gh auth refresh -h github.com -s workflow
cd ~/Downloads/uplof-landing-page
mkdir -p .github/workflows
git mv .tools/publish-workflow.yml .github/workflows/publish.yml
git commit -m "Activate scheduled publishing" && git push
```

**Option B — do it in the browser:** open `.tools/publish-workflow.yml` on GitHub,
copy the contents, then Actions → New workflow → set up a workflow yourself →
paste → name it `publish.yml` → commit.

Once it is at `.github/workflows/publish.yml` it runs at **00:15 and 12:15 IST**
and whenever you trigger it by hand from the Actions tab.

### How you schedule something

1. Write the article in `/admin/`
2. Set **Publish on** to a future date
3. **Untick Draft** — this is the bit people miss. A draft is skipped whatever
   its date says
4. Save

The build logs it every run until it is due:

```
scheduled, not due yet:
  my-article  ->  due 2026-10-14
```

On the morning of the 14th, IST, it publishes itself. Sitemap, RSS, cluster page
and index all update in the same run.

### Worth knowing

- **Dates are compared in Asia/Kolkata**, not UTC. An article dated today
  publishes on today's first run — using UTC would have held it until 05:30 IST,
  which is most of an Indian working day.
- **A scheduled article that fails validation does not go live.** The build exits
  non-zero, the deploy step never runs, and the previous version stays up.
- **Deleting or renaming an article removes its old page.** The build clears
  output for anything that no longer exists, so a deleted article does not linger
  at its URL or in the sitemap.
- **You can still deploy by hand** with `npm run deploy`. The workflow is an
  addition, not a replacement.
