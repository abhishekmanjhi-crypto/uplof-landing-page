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
import { readFile, writeFile, mkdir, readdir, stat, rm } from "node:fs/promises";
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

// The same entity graph the legal pages carry. Without it the Article schema
// references an author and publisher that exist nowhere on the page.
const SHARED_GRAPH = JSON.parse(await readFile(path.join(HERE, "partials", "graph.json"), "utf8"));
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
  // Google retired FAQ rich results in May 2026, so these are not here for a
  // dropdown in the results page — they are here because they answer the
  // questions a reader actually has next, and because an AI answer can quote them.
  const faqHtml = fm.faqs?.length
    ? `<section class="insight__faq">
  <h2>Related questions</h2>
${fm.faqs.map((q) => `  <details class="faq__item">
    <summary class="faq__q">${esc(q.question)}</summary>
    <div class="faq__a">${marked.parse(String(q.answer))}</div>
  </details>`).join("\n")}
</section>`
    : "";
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
<meta property="og:image" content="${hero ? BASE + hero.src : BASE + '/assets/img/og-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fm.title)}">
<meta name="twitter:description" content="${esc(fm.description)}">
<link rel="alternate" type="application/rss+xml" title="Uplof insights" href="/insights/feed.xml">
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
${faqHtml}
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

/** YAML turns an unquoted date into a Date object, not a string, so a naive
 *  String() gives "Fri Dec 25 2026 ..." and every comparison silently fails.
 *  Normalise both shapes to YYYY-MM-DD. */
function isoDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Today's date where the business actually is.
const TODAY_IST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const pending = [];
const scheduled = [];
const files = (await readdir(SRC)).filter((f) => f.endsWith(".md")).sort();
const built = [];

for (const file of files) {
  const raw = await readFile(path.join(SRC, file), "utf8");
  const { data: fm, content } = matter(raw);
  const slug = fm.slug || file.replace(/\.md$/, "");
  if (fm.draft) { console.log(`  draft, skipped: ${slug}`); continue; }

  // Scheduling. A publishDate in the future means the article is written and
  // approved but not due yet, so it is skipped and a later build picks it up.
  // The scheduled workflow in .github/workflows/publish.yml rebuilds twice a
  // day, which is what actually makes it appear without anyone doing anything.
  //
  // Compared as plain YYYY-MM-DD strings in Asia/Kolkata, not as timestamps.
  // Using UTC would hold an article dated today until after 05:30 IST, because
  // UTC is still on yesterday's date for the first five and a half hours of an
  // Indian working day.
  if (fm.publishDate) {
    const due = isoDate(fm.publishDate);
    if (due && due > TODAY_IST) {
      scheduled.push({ slug, date: due });
      continue;
    }
  }

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

  const article = {
    "@type": "Article",
    "@id": `${BASE}/insights/${slug}/#article`,
    headline: fm.title,
    description: fm.description,
    datePublished: fm.publishDate,
    ...(fm.updatedDate ? { dateModified: fm.updatedDate } : {}),
    author: { "@id": `${BASE}/#abhishek` },
    publisher: { "@id": `${BASE}/#organization` },
    isPartOf: { "@id": `${BASE}/insights/#blog` },
    mainEntityOfPage: `${BASE}/insights/${slug}/`,
    ...(hero ? { image: `${BASE}${hero.src}` } : {}),
    ...(fm.faqs?.length ? {
      mentions: fm.faqs.map((q) => ({
        "@type": "Question", name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.answer },
      })),
    } : {}),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${BASE}/insights/${slug}/#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Insights", item: `${BASE}/insights/` },
      { "@type": "ListItem", position: 3, name: fm.title, item: `${BASE}/insights/${slug}/` },
    ],
  };

  // The shared entity graph travels with every page, so the author and
  // publisher the Article names actually resolve to nodes that are present.
  const jsonld = `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org",
                   "@graph": [...SHARED_GRAPH, article, breadcrumb] }, null, 2)}
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

/* --------------------------------------------- index, cluster hubs and feed */
function listPage({ slug, eyebrow, title, lead, posts, jsonld, canonical }) {
  const cards = posts.map((p) => `        <a class="insight-card" href="/insights/${p.slug}/">
          <p class="insight-card__eyebrow">${esc(String(p.cluster).replace(/-/g, " "))}</p>
          <h2 class="insight-card__title">${esc(p.title)}</h2>
          <p class="insight-card__line">${esc(p.description)}</p>
        </a>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Uplof</title>
<meta name="description" content="${esc(lead)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#d12d34">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Uplof">
<meta property="og:title" content="${esc(title)} | Uplof">
<meta property="og:description" content="${esc(lead)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${BASE}/assets/img/og-card.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="Uplof insights" href="/insights/feed.xml">
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
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1 class="masthead__title">${esc(title)}</h1>
    <p class="lead masthead__lead">${esc(lead)}</p>
  </div>
</header>
<main class="section" id="main">
  <div class="container">
    <div class="insight-grid">
${cards}
    </div>
${slug ? `    <p class="micro" style="margin-block-start:var(--space-8)"><a href="/insights/">All insights</a></p>` : ""}
  </div>
</main>
${FOOTER}
<script src="/cookie-consent.js?v=${V}" defer></script>
</body>
</html>
`;
}

const CLUSTERS = {
  "lead-management": ["Lead management", "Where enquiries get lost between your website, WhatsApp and follow-up, and how to close the gap."],
  "websites": ["Websites", "Pages built to take an enquiry properly, not just to look good."],
  "local-seo": ["Local SEO", "Getting found by people searching nearby, and turning those searches into calls."],
  "tracking": ["Tracking", "Knowing which channel produced the customer, not just which produced the click."],
};

// Remove output for articles that no longer exist, were renamed, or are now
// drafts or scheduled. Without this a deleted article stays live and the
// sitemap keeps listing it.
const keep = new Set([...pending.map((p) => p.slug), "index.html", "feed.xml", ...Object.keys(CLUSTERS)]);
if (existsSync(OUT_DIR)) {
  for (const entry of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !keep.has(entry.name)) {
      await rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
      console.log(`  removed stale: insights/${entry.name}/`);
    }
  }
}


if (built.length) {
  built.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

  const blogNode = {
    "@type": "Blog",
    "@id": `${BASE}/insights/#blog`,
    name: "Uplof insights",
    url: `${BASE}/insights/`,
    publisher: { "@id": `${BASE}/#organization` },
    blogPost: built.map((p) => ({ "@id": `${BASE}/insights/${p.slug}/#article` })),
  };
  const indexLd = `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": [...SHARED_GRAPH, blogNode] }, null, 2)}
</script>`;

  await writeFile(path.join(OUT_DIR, "index.html"), listPage({
    slug: "", eyebrow: "Insights", title: "Where enquiries go missing.",
    lead: "Straight answers, written from real lead journeys rather than general advice.",
    posts: built, jsonld: indexLd, canonical: `${BASE}/insights/`,
  }));
  console.log(`  insights/  (${built.length} article${built.length === 1 ? "" : "s"})`);

  // A hub per topic. These are what make a cluster a cluster rather than a pile
  // of articles, and they are the pages that will rank for the broad term.
  for (const [key, [label, lead]] of Object.entries(CLUSTERS)) {
    const posts = built.filter((p) => p.cluster === key);
    if (!posts.length) continue;          // never publish an empty hub
    const ld = `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": [...SHARED_GRAPH, {
      "@type": "CollectionPage",
      "@id": `${BASE}/insights/${key}/#collection`,
      name: `${label} — Uplof insights`,
      url: `${BASE}/insights/${key}/`,
      isPartOf: { "@id": `${BASE}/insights/#blog` },
      hasPart: posts.map((p) => ({ "@id": `${BASE}/insights/${p.slug}/#article` })),
    }] }, null, 2)}
</script>`;
    await mkdir(path.join(OUT_DIR, key), { recursive: true });
    await writeFile(path.join(OUT_DIR, key, "index.html"), listPage({
      slug: key, eyebrow: "Insights", title: label, lead, posts, jsonld: ld,
      canonical: `${BASE}/insights/${key}/`,
    }));
    console.log(`  insights/${key}/  (${posts.length})`);
  }

  // RSS. Cheap to produce, and it is how a reader, a newsreader or a crawler
  // subscribes without us having to be told about it.
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Uplof insights</title>
    <link>${BASE}/insights/</link>
    <description>Where enquiries go missing between your website, search and follow-up.</description>
    <language>en-IN</language>
    <atom:link href="${BASE}/insights/feed.xml" rel="self" type="application/rss+xml"/>
${built.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${BASE}/insights/${p.slug}/</link>
      <guid isPermaLink="true">${BASE}/insights/${p.slug}/</guid>
      <pubDate>${new Date(p.publishDate).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;
  await writeFile(path.join(OUT_DIR, "feed.xml"), rss);
  console.log("  insights/feed.xml");
}

if (scheduled.length) {
  console.log("  scheduled, not due yet:");
  for (const sch of scheduled) console.log(`    ${sch.slug}  ->  due ${sch.date}`);
}
console.log(`insights: ${built.length} built, ${scheduled.length} scheduled (today is ${TODAY_IST} IST), 0 problems`);
