# Uplof content guide

The standard every page and article on uplof.me is held to, and the CMS spec that
enforces it.

Written 22 September 2026. Sources are Google's own documentation, linked inline.
This file lives in the repo on purpose — it should be open in the next tab while
you write, not filed in a folder you never open.

---

## 0. Read this before the checklist

**Most "optimise for AI search" advice is selling you something.** Google's own
[guide to generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
says, in its own words:

- `llms.txt` — "Google Search itself doesn't use them"
- Content chunking — "There's no requirement to break your content into tiny pieces for AI to better understand it"
- Special markup — not needed
- Writing style — "You don't need to write in a specific way just for generative AI search"
- Keyword variations — you do not need a page for every phrasing
- Structured data — "isn't required for generative AI search"

That last one is worth sitting with. We shipped structured data anyway, because it
earns rich results and helps establish Uplof as an entity rather than a typo for
"upload". But it is not the thing that gets us cited.

**What Google actually names:** content you could only have written, clear headings
and sections, genuinely good writing, original images and video, crawlable and fast
pages. That is the whole list.

So this guide is deliberately short on AI tricks and long on evidence. The
differentiator is not markup. It is that we have looked at a real lead journey and
almost nobody else publishing on this topic has.

---

## 1. The three content types

| Type | Purpose | URL shape | Schema |
|---|---|---|---|
| **Insight** | Answers one real question a business owner asks | `/insights/<slug>/` | `Article` |
| **Service** | Commercial page for one thing we sell | `/<slug>/` | `Service` + `Organization` |
| **Case study** | One real engagement, with evidence | `/work/<slug>/` | `Article` + `CreativeWork` |

Anything that does not fit one of these three probably should not be published.

---

## 2. The page format

Every **insight** follows this order. It is not a suggestion — consistency is what
lets a reader skim the fifth article as fast as the first, and what lets an AI
system find the answer without guessing.

1. **H1 — the question in the reader's words.**
   `Why is my website getting traffic but no leads?`
   Not `Conversion Rate Optimisation Services`.

2. **Quick answer — 50 to 80 words, before anything else.**
   No preamble, no origin story, no "in today's digital landscape". If the reader
   stops here they should still have been helped. This is also the block most
   likely to be quoted by an AI answer.

3. **What can actually be broken — the journey ladder.**
   Traffic → landing page → trust → CTA → form/call/WhatsApp → CRM → follow-up.
   Our whole positioning, rendered as a diagram. Original image, every time.

4. **How to diagnose it.** Checks the reader can run today, on their own site,
   without us. Genuine utility is what earns the bookmark and the link.

5. **What we see most often.** First-hand experience. This is the section that
   cannot be copied from anyone else, and it is the reason the page exists.

6. **A real example, with evidence.** Screenshot, anonymised. Proof beats prose.

7. **When you do NOT need us.** Counter-intuitive honesty is the fastest
   trust-builder available to a brand nobody has heard of.

8. **India / Mumbai context — only where it changes the answer.** WhatsApp-first
   behaviour, mobile data cost, COD, local search habits. A bolted-on local
   paragraph reads as filler and everyone can tell.

9. **Related questions, then one clear CTA.**
   "Send me your website and I'll trace it" converts better than "Contact us".

---

## 3. Publish checklist

Nothing goes live until every box is ticked. The CMS enforces the ones marked
**(auto)**.

### Content
- [ ] H1 is a real question or a plain statement, not a service name
- [ ] Quick answer is 50–80 words **(auto: word count)**
- [ ] At least one thing in this page could not have been written by a competitor
- [ ] At least one original image, diagram or screenshot — not stock **(auto: ≥1 image)**
- [ ] "When you don't need us" section is present and honest
- [ ] Headings descend without skipping (H1 → H2 → H3) **(auto)**
- [ ] Reads out loud without embarrassment

### Metadata
- [ ] Title tag: keyword-led on service pages, brand-led on the homepage, question-led on insights
- [ ] Meta description 140–160 characters **(auto: length)**
- [ ] Slug is short, lowercase, hyphenated, no dates, no stop words
- [ ] Canonical URL set **(auto)**
- [ ] Publish date and updated date **(auto)**
- [ ] Author set to a real person **(auto: required field)**

### Media
- [ ] Filename describes the image: `lead-journey-audit-mumbai.webp`, never `IMG_2931.png`
- [ ] Alt text describes what the image shows, never a keyword list **(auto: required)**
- [ ] Meaningful images are real `<img>` elements, not CSS backgrounds
- [ ] Compressed and converted to WebP/AVIF **(auto: build pipeline)**
- [ ] Width and height present so nothing shifts while loading **(auto)**

### Links
- [ ] At least two internal links to related Uplof pages **(auto: ≥2)**
- [ ] Every external claim links to its source
- [ ] No broken links **(auto: build check)**

### Structured data
- [ ] Correct schema type for the content type **(auto)**
- [ ] Author and publisher resolve to real nodes **(auto)**
- [ ] `datePublished` and `dateModified` accurate **(auto)**
- [ ] Validated in the [Rich Results Test](https://search.google.com/test/rich-results)

### After publishing
- [ ] Added to the sitemap **(auto: `npm run deploy`)**
- [ ] Submitted in Search Console → URL Inspection → Request Indexing
- [ ] Turned into 3 LinkedIn posts
- [ ] Posted as a Google Business Profile update
- [ ] Logged in the workbook

---

## 4. CMS specification

### What it must do

| Requirement | How |
|---|---|
| Write and edit without touching code | Sveltia CMS — a real editor UI over the repo |
| Login with a password | GitHub OAuth via a Cloudflare Worker |
| Automatic image compression | Astro's image pipeline at build: WebP/AVIF, responsive `srcset`, width/height injected |
| Enforce the schema above | Astro content collections — a typed schema that fails the build if a required field is missing |
| No new hosting, no database | Everything stays on Cloudflare Pages; content is markdown in git |
| Free | Sveltia and Astro are open source; the Worker is on the free tier |

### The three real candidates

Astro sits underneath all three — the decision is only about where the content
lives and what the writing interface is.

| | **Sveltia CMS** | **Sanity** | **WordPress** |
|---|---|---|---|
| Open source | Yes, fully | Studio yes, **content store no** | Yes |
| Where content lives | Markdown in your git repo | Sanity's hosted Content Lake | Their MySQL database |
| Cost | Free, no ceiling | Free tier, then $15/seat/mo | Hosting + plugins |
| Image compression | Astro, at build | **Sanity CDN, on the fly** | Plugin |
| Login | GitHub OAuth | Email / Google / GitHub | Built in |
| Editors need a GitHub account | **Yes** | No | No |
| Survives you leaving it | Content is already markdown | Export as JSON | Export as XML |
| Real-time collaboration | No | Yes | No |
| Risk | Niche project | Vendor dependency | Security and updates |

**WordPress is the wrong answer here**, despite being what most people reach for.
It would replace a hand-built design system with a theme, add a database and a
permanent security and update burden, and make the site slower — a poor look for a
business selling conversion. Every advantage it has is one we do not need: we are
one author publishing text.

### On Sanity specifically

It is a genuinely good product and the closest call in this document.

**Where it wins:** its image pipeline is better than Astro's for this purpose —
transforms happen on the fly through their CDN, so nothing bloats the repo and you
never rebuild to change a crop. It answers the "I don't want to think about images"
requirement more directly than anything else here. Editors sign in with an email
rather than needing a GitHub account, which matters the day a writer is hired. The
free tier is real and generous: 20 seats, 2 datasets, 500,000 CDN requests and 10GB
bandwidth a month, with no time limit.

**Where it does not fit what was asked for:** the request was an *open source* CMS.
Sanity Studio — the editing interface — is open source. The Content Lake, where
your articles actually live, is a hosted service you do not control and cannot
self-host. That is a meaningful distinction, not a technicality.

**Two practical consequences worth knowing before choosing it:**

- The free plan enforces **hard limits rather than overage billing**. You are not
  surprised by an invoice; you are blocked until you upgrade. For a site whose
  whole job is capturing leads, a ceiling that stops serving is a different kind of
  risk from a bill.
- A static site needs a webhook from Sanity to a Cloudflare deploy hook so
  publishing triggers a rebuild. Straightforward, but it is another moving part
  between pressing Publish and the article appearing.

### Recommendation

**Sveltia**, but it is close enough that choosing Sanity would not be a mistake.

Three reasons it edges ahead here:

1. **You own everything, permanently.** Articles are markdown in the repo. If the
   CMS dies, is acquired, or changes its pricing, the content is untouched. For a
   business whose product is "I make sure nothing gets lost between systems", not
   handing your content to a third party has a certain consistency.
2. **No ceiling.** Nothing can block your site because a monthly quota ran out.
3. **Astro already solves the image requirement.** WebP/AVIF conversion, responsive
   `srcset` and width/height injection happen automatically at build. Sanity's
   version is better, but Astro's is good enough that it should not decide this.

**Choose Sanity instead if** you expect to hire a writer or VA within six months,
or if you would rather never think about images again. Both are legitimate reasons
and the switch costs about a day.

### Honest caveats

- **The CMS does not compress images. The build does.** Sveltia stores whatever
  you upload; Astro optimises it at build time. So a 4MB PNG will sit in the repo
  looking alarming while the served image is 80KB. That is working as intended, but
  it surprises people.
- **Editors need a GitHub account.** Fine for one founder. If a writer is hired
  later, either add them to the repo or switch the auth to Cloudflare Access with
  an email login.
- **Migrating to Astro is a real job**, roughly one to two days. The CSS, tokens
  and design system carry over untouched — it is mostly moving `index.html` into a
  layout and the legal pages into collections. But it touches everything, so it
  needs testing, not a Friday-evening deploy.

### Collection schema

```
insights/
  title            string, required
  slug             string, required, unique
  description      string, required, 140–160 chars
  quickAnswer      string, required, 50–80 words
  publishDate      date, required
  updatedDate      date, optional
  author           reference → authors, required
  cluster          enum: lead-management | websites | local-seo | tracking
  heroImage        image, required
  heroAlt          string, required
  evidence         enum: screenshot | data | client-example | none
  evidenceNote     string, optional — where the data came from
  faqs             array of { question, answer }, optional
  related          array of references, min 2, required
  draft            boolean, default true
```

Required fields are kept to eight on purpose. A schema demanding thirty fields is
a schema nobody publishes against — the failure mode of a content system is not a
weak article, it is an empty site.

---

## 5. Build order

1. Migrate the site to Astro, design system unchanged
2. Add content collections with the schema above
3. Add the image pipeline
4. Add Sveltia CMS and the auth Worker
5. Add the build-time validators (word counts, alt text, internal links)
6. Migrate the four legal pages from the Python generator
7. Publish the first insight

Steps 1–6 are infrastructure. Step 7 is the only one a customer ever sees. If the
infrastructure starts eating weeks, publish the first article as hand-written HTML
and come back to it — an empty CMS is procrastination that looks like progress.
