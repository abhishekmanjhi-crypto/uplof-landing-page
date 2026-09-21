/**
 * Build /insights/ from markdown, with no framework.
 *
 * Why not Astro: the site is six pages of hand-written HTML on top of a design
 * system that already works, and a Python generator that already produces
 * perfect pages. Migrating all of that to get a markdown pipeline would be a
 * couple of days of risk to gain something this file does in a few hundred
 * lines. Nothing about Astro was needed here except image optimisation, and
 * sharp does that directly.
 *
 * What it does:
 *   content/insights/*.md  ->  insights/<slug>/index.html  +  insights/index.html
 *   any image referenced   ->  WebP at three widths, with <picture> and srcset
 *
 * The front matter is validated against the rules in CONTENT-GUIDE.md and the
 * build FAILS on a violation rather than publishing something half-finished.
 * That is the point: the checklist is only real if something enforces it.
 */
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import matter from "gray-matter";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const SRC = path.join(ROOT, "content", "insights");
const UPLOADS = path.join(ROOT, "content", "uploads");
const OUT_DIR = path.join(ROOT, "insights");
const IMG_OUT = path.join(ROOT, "assets", "insights");
const BASE = "https://uplof.me";

// Bumped together with the HTML files. Read from index.html so there is one
// source of it rather than a second place to forget.
const V = (await readFile(path.join(ROOT, "index.html"), "utf8")).match(/\?v=(\d+)/)?.[1] ?? "1";

const NAVBAR = await readFile(path.join(HERE, "partials", "navbar.html"), "utf8");
const FOOTER = await readFile(path.join(HERE, "partials", "footer.html"), "utf8");

const WIDTHS = [480, 900, 1400];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

/* ------------------------------------------------------------------ images */
/** Resize once per width, convert to WebP, and return what <picture> needs. */
async function processImage(rel, fromDir) {
  // Sveltia writes whatever `public_folder` says into the markdown, which may be
  // a bare filename, a leading slash, or the full repo path. Normalise all three
  // so a hand-written reference and a CMS-written one resolve the same way.
  rel = String(rel).replace(/^\/+/, "").replace(/^content\/uploads\//, "");
  const src = path.join(fromDir, rel);
  if (!existsSync(src)) return null;
  const base = path.basename(rel).replace(/\.[^.]+$/, "");
  const meta = await sharp(src).metadata();
  await mkdir(IMG_OUT, { recursive: true });

  const made = [];
  for (const w of WIDTHS) {
    if (meta.width && meta.width < w && made.length) break;   // never upscale
    const name = `${base}-${w}.webp`;
    const dest = path.join(IMG_OUT, name);
    // Skip work that is already done — a rebuild of 40 articles should not
    // re-encode every image every time.
    if (!existsSync(dest) || (await stat(src)).mtimeMs > (await stat(dest)).mtimeMs) {
      await sharp(src).resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 }).toFile(dest);
    }
    made.push({ w, url: `/assets/insights/${name}` });
  }
  const widest = made[made.length - 1];
  const ratio = meta.width && meta.height ? meta.height / meta.width : 0.625;
  return {
    srcset: made.map((m) => `${m.url} ${m.w}w`).join(", "),
    src: widest.url,
    width: Math.min(meta.width || 1400, WIDTHS[WIDTHS.length - 1]),
    height: Math.round(Math.min(meta.width || 1400, WIDTHS[WIDTHS.length - 1]) * ratio),
  };
}

/* --------------------------------------------------------------- rendering */
function renderer(imageMap) {
  const r = new marked.Renderer();
  const baseImage = r.image.bind(r);
  r.image = function (token) {
    const href = typeof token === "string" ? token : token.href;
    const text = typeof token === "string" ? arguments[2] : token.text;
    const got = imageMap.get(href);
    if (!got) return baseImage.apply(this, arguments);
    // Width and height are emitted so nothing shifts while the page loads.
    return `<figure class="insight__figure">
  <img src="${got.src}" srcset="${got.srcset}" sizes="(max-width: 760px) 100vw, 760px"
       width="${got.width}" height="${got.height}" alt="${esc(text || "")}" loading="lazy" decoding="async">
</figure>`;
  };
  return r;
}

/* ------------------------------------------------------------- validation */
function validate(file, fm, body, html) {
  const need = ["title", "description", "quickAnswer", "publishDate", "author", "cluster", "heroImage", "heroAlt"];
  for (const k of need) if (!fm[k]) fail(file, `missing required field "${k}"`);

  if (fm.description) {
    const n = fm.description.length;
    if (n < 140 || n > 160) fail(file, `description is ${n} characters, must be 140-160`);
  }
  if (fm.quickAnswer) {
    const n = words(fm.quickAnswer);
    if (n < 50 || n > 80) fail(file, `quickAnswer is ${n} words, must be 50-80`);
  }
  // At least two internal links: the rule that stops articles being orphans.
  const internal = [...html.matchAll(/href="\/(?!\/)[^"]*"/g)].length;
  if (internal < 2) fail(file, `only ${internal} internal links, needs at least 2`);

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const alt = m[0].match(/\balt="([^"]*)"/);
    // An empty alt is the marker for a decorative image. An image inside an
    // article is never decorative, so an empty one is a missing description.
    if (!alt) fail(file, "an image has no alt attribute");
    else if (!alt[1].trim()) fail(file, "an image has an empty alt — describe what it shows");
  }
  // Heading order: h2 -> h3 without skipping, since h1 is the title.
  let last = 2;
  for (const m of html.matchAll(/<h([23456])\b/g)) {
    const lvl = Number(m[1]);
    if (lvl > last + 1) fail(file, `heading jumps from h${last} to h${lvl}`);
    last = lvl;
  }
  if (!fm.related || fm.related.length < 2) fail(file, "needs at least 2 entries in `related`");
}

/* ---------------------------------------------------------------- template */
function page({ fm, bodyHtml, slug, hero, jsonld }) {
  const url = `${BASE}/insights/${slug}/`;
  const heroImg = hero
    ? `<figure class="insight__hero">
  <img src="${hero.src}" srcset="${hero.srcset}" sizes="(max-width: 860px) 100vw, 860px"
       width="${hero.width}" height="${hero.height}" alt="${esc(fm.heroAlt)}" decoding="async">
</figure>`
    : "";
  const related = (fm.related || [])
    .map((r) => `        <a class="legal-more__card" href="${esc(r.url)}">${esc(r.label)}</a>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fm.title)} | Uplof</title>
<meta name="description" content="${esc(fm.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#d12d34">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Uplof">
<meta property="og:title" content="${esc(fm.title)}">
<meta property="og:description" content="${esc(fm.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/img/og-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fm.title)}">
<meta name="twitter:description" content="${esc(fm.description)}">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
${jsonld}
<link rel="stylesheet" href="/css/tokens.css?v=${V}">
<link rel="stylesheet" href="/css/base.css?v=${V}">
<link rel="stylesheet" href="/css/components.css?v=${V}">
<link rel="stylesheet" href="/css/blocks.css?v=${V}">
<link rel="stylesheet" href="/css/legal.css?v=${V}">
<link rel="stylesheet" href="/css/insight.css?v=${V}">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

${NAVBAR}
<header class="masthead on-brand">
  <div class="container masthead__inner">
    <p class="eyebrow">${esc(fm.cluster.replace(/-/g, " "))}</p>
    <h1 class="masthead__title">${esc(fm.title)}</h1>
    <p class="masthead__meta">${esc(fm.author)} &middot; ${new Date(fm.publishDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}${fm.updatedDate ? ` &middot; updated ${new Date(fm.updatedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}</p>
  </div>
</header>

<main class="section" id="main">
  <div class="container">
    <div class="prose">
      <div class="insight__answer">
        <p class="insight__answer-label">Short answer</p>
        <p>${esc(fm.quickAnswer)}</p>
      </div>
${heroImg}
${bodyHtml}
    </div>
${related ? `      <div class="legal-more">
        <p class="legal-more__title">Related</p>
        <div class="legal-more__grid">
${related}
        </div>
      </div>` : ""}
  </div>
</main>

${FOOTER}
<script src="/cookie-consent.js?v=${V}" defer></script>
</body>
</html>
`;
}

/* -------------------------------------------------------------------- main */
if (!existsSync(SRC)) {
  console.log("insights: no content/insights/ directory yet, nothing to build");
  process.exit(0);
}

const pending = [];
const files = (await readdir(SRC)).filter((f) => f.endsWith(".md")).sort();
const built = [];

for (const file of files) {
  const raw = await readFile(path.join(SRC, file), "utf8");
  const { data: fm, content } = matter(raw);
  const slug = fm.slug || file.replace(/\.md$/, "");
  if (fm.draft) { console.log(`  draft, skipped: ${slug}`); continue; }

  // Every image the markdown references, plus the hero, resized once.
  const imageMap = new Map();
  for (const m of content.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const got = await processImage(m[1], UPLOADS);
    if (got) imageMap.set(m[1], got);
    else fail(file, `image not found: ${m[1]}`);
  }
  const hero = fm.heroImage ? await processImage(fm.heroImage, UPLOADS) : null;
  if (fm.heroImage && !hero) fail(file, `heroImage not found: ${fm.heroImage}`);

  const bodyHtml = marked.parse(content, { renderer: renderer(imageMap) });
  validate(file, fm, content, bodyHtml);

  const jsonld = `<script type="application/ld+json">
${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    datePublished: fm.publishDate,
    ...(fm.updatedDate ? { dateModified: fm.updatedDate } : {}),
    author: { "@id": `${BASE}/#abhishek` },
    publisher: { "@id": `${BASE}/#organization` },
    mainEntityOfPage: `${BASE}/insights/${slug}/`,
    ...(fm.faqs?.length ? {
      mentions: fm.faqs.map((q) => ({ "@type": "Question", name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.answer } })),
    } : {}),
  }, null, 2)}
</script>`;

  pending.push({ fm, slug, html: page({ fm, bodyHtml, slug, hero, jsonld }) });
}

if (problems.length) {
  console.error("\ncontent build FAILED — nothing written:\n");
  for (const p of problems) console.error("  " + p);
  console.error("\nSee CONTENT-GUIDE.md for what each rule is for.");
  process.exit(1);
}

for (const { fm, slug, html } of pending) {
  await mkdir(path.join(OUT_DIR, slug), { recursive: true });
  await writeFile(path.join(OUT_DIR, slug, "index.html"), html);
  built.push({ ...fm, slug });
  console.log(`  insights/${slug}/`);
}

/* ------------------------------------------------------------ index page */
if (built.length) {
  built.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  const cards = built.map((p) => `        <a class="insight-card" href="/insights/${p.slug}/">
          <p class="insight-card__eyebrow">${esc(String(p.cluster).replace(/-/g, " "))}</p>
          <h2 class="insight-card__title">${esc(p.title)}</h2>
          <p class="insight-card__line">${esc(p.description)}</p>
        </a>`).join("\n");

  await writeFile(path.join(OUT_DIR, "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Insights | Uplof</title>
<meta name="description" content="Straight answers about where enquiries get lost between your website, search and follow-up. Written from real lead journeys, not general advice.">
<link rel="canonical" href="${BASE}/insights/">
<meta name="theme-color" content="#d12d34">
<meta property="og:type" content="website">
<meta property="og:title" content="Insights | Uplof">
<meta property="og:url" content="${BASE}/insights/">
<meta property="og:image" content="${BASE}/assets/img/og-card.png">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/tokens.css?v=${V}">
<link rel="stylesheet" href="/css/base.css?v=${V}">
<link rel="stylesheet" href="/css/components.css?v=${V}">
<link rel="stylesheet" href="/css/blocks.css?v=${V}">
<link rel="stylesheet" href="/css/legal.css?v=${V}">
<link rel="stylesheet" href="/css/insight.css?v=${V}">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${NAVBAR}
<header class="masthead on-brand">
  <div class="container masthead__inner">
    <p class="eyebrow">Insights</p>
    <h1 class="masthead__title">Where enquiries go missing.</h1>
    <p class="lead masthead__lead">Straight answers, written from real lead journeys rather than general advice.</p>
  </div>
</header>
<main class="section" id="main">
  <div class="container">
    <div class="insight-grid">
${cards}
    </div>
  </div>
</main>
${FOOTER}
<script src="/cookie-consent.js?v=${V}" defer></script>
</body>
</html>
`);
  console.log(`  insights/  (${built.length} article${built.length === 1 ? "" : "s"})`);
}

console.log(`insights: ${built.length} built, 0 problems`);
