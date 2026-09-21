#!/usr/bin/env python3
# Generates the four Uplof legal pages from ONE shared shell.
# Consistency is guaranteed by construction: the navbar, masthead, footer and
# asset references exist in exactly one place in this file.

import os
import re

ROOT = "/Users/abhishek/Downloads/uplof-landing-page"
V = "19"  # cache-bust version, bumped together with index.html

SHARED_GRAPH_JSON = r"""[{"@type": "Organization", "@id": "https://uplof.me/#organization", "name": "Uplof", "alternateName": ["Uplof.me", "Uplof Digital"], "url": "https://uplof.me/", "logo": {"@type": "ImageObject", "url": "https://uplof.me/assets/email/logo.png", "width": 216, "height": 138}, "image": "https://uplof.me/assets/img/og-card.png", "description": "Uplof connects search, websites, lead capture, CRM and follow-up so fewer enquiries disappear between the steps.", "email": "hello@uplof.me", "telephone": "+91-77108-94943", "founder": {"@id": "https://uplof.me/#abhishek"}, "areaServed": {"@type": "City", "name": "Mumbai"}, "knowsAbout": ["Lead management", "Search engine optimisation", "Local SEO", "Conversion rate optimisation", "CRM implementation", "Marketing attribution"]}, {"@type": "WebSite", "@id": "https://uplof.me/#website", "url": "https://uplof.me/", "name": "Uplof", "publisher": {"@id": "https://uplof.me/#organization"}, "inLanguage": "en-IN"}, {"@type": "Person", "@id": "https://uplof.me/#abhishek", "name": "Abhishek Manjhi", "jobTitle": "Founder", "worksFor": {"@id": "https://uplof.me/#organization"}, "url": "https://uplof.me/#founder"}]"""

PAGES = [
    {
        "slug": "privacy-policy",
        "notice": "Uplof is a service business operated by Abhishek Kumar. For privacy questions or a request about your information, contact <a href=\"mailto:hello@uplof.me\">hello@uplof.me</a>.",
        "title": "Privacy Policy",
        "nav": "Privacy",
        "eyebrow": "Legal / Privacy",
        "desc": "How Uplof collects, uses, shares and protects the information you share when you enquire, and how to ask for access, correction or deletion of it.",
        "lead": "This policy explains how Uplof handles information you share when you visit our website or contact us about our services.",
        # NOTE: the operator name is left EXACTLY as the original legal page had
        # it ("Abhishek Kumar"), even though index.html and functions/api/lead.js
        # both say "Abhishek Manjhi". Which is the correct legal name is the
        # owner's call, not a design decision — flagged to the user, not guessed.
        "body": """<h2>Information we collect</h2>
<p>We may receive your name, business name, email address, phone number, website address and project details when you submit an enquiry, contact us by email, phone or WhatsApp, or otherwise choose to share them. We also receive limited technical information such as browser, device and approximate usage data when it is needed to keep the site secure and working.</p>

<h2>How we use it</h2>
<p>We use information to respond to enquiries, prepare proposals, deliver and support agreed services, improve our website and protect our systems. We do not sell personal information.</p>

<h2>Sharing and retention</h2>
<p>We share information only with providers needed to operate the website, communications or an agreed project, or where required by law. We keep enquiry and project records for as long as reasonably needed for these purposes, then delete or anonymise them where practical.</p>

<h2>Your choices</h2>
<p>You can ask us to access, correct or delete personal information, or to stop a marketing message. Email <a href="mailto:hello@uplof.me">hello@uplof.me</a> and include enough detail for us to identify your request. You may also control cookies through your browser settings.</p>

<h2>Updates</h2>
<p>We may update this policy as our services change. The effective date above shows when it was last revised.</p>""",
    },
    {
        "slug": "terms-of-service",
        "notice": "Uplof is a service business operated by Abhishek Kumar. For questions about these terms, contact <a href=\"mailto:hello@uplof.me\">hello@uplof.me</a>.",
        "title": "Terms of Service",
        "nav": "Terms",
        "eyebrow": "Legal / Terms",
        "desc": "The terms that apply when you use uplof.me or engage Uplof for website, search, conversion and follow-up work: scope, ownership, payment and notice.",
        "lead": "These terms apply when you use uplof.me or engage Uplof for website, search, conversion and follow-up services.",
        "body": """<h2>Working together</h2>
<p>Each project is governed by a written proposal or statement of work that confirms scope, deliverables, timeline, fees, revisions and responsibilities. A project begins when both parties accept that scope and any required deposit is received.</p>

<h2>Your responsibilities</h2>
<p>You provide accurate business information, timely feedback, approvals and lawful rights to any content, images, trademarks or data supplied to us. You are responsible for checking final content and confirming that claims, offers and contact details are accurate before launch.</p>

<h2>Our responsibilities</h2>
<p>We will perform the agreed services with reasonable care and skill, communicate material changes and deliver the agreed work. Results such as rankings, traffic, leads or revenue depend on many factors and are not guaranteed.</p>

<h2>Ownership and permissions</h2>
<p>Once all agreed fees are paid, you receive the rights described in the proposal for final, custom deliverables. We retain rights to our pre-existing tools, methods and reusable components. We may show non-confidential work in our portfolio unless the proposal says otherwise.</p>

<h2>Payment, pause and termination</h2>
<p>Invoices are due by the date stated in the proposal. Work may pause for overdue invoices or missing approvals. Either party may end a project with written notice; fees for completed work, committed costs and approved third-party services remain payable.</p>

<h2>Contact</h2>
<p>Questions about these terms can be sent to <a href="mailto:hello@uplof.me">hello@uplof.me</a> or <a href="tel:+917710894943">+91 77108 94943</a>.</p>""",
    },
    {
        "slug": "refund-cancellation-policy",
        "notice": "Uplof is a service business operated by Abhishek Kumar. For questions about a refund or cancellation, contact <a href=\"mailto:hello@uplof.me\">hello@uplof.me</a>.",
        "title": "Refund and Cancellation Policy",
        "nav": "Refunds",
        "eyebrow": "Legal / Payments",
        "desc": "How deposits, cancellations, pauses and third-party charges work on an Uplof engagement, and how to request a refund if your plans change.",
        "lead": "Clear expectations for deposits, project cancellations and changes to an active Uplof engagement.",
        "body": """<h2>Before work starts</h2>
<p>If you cancel before work begins, contact us at <a href="mailto:hello@uplof.me">hello@uplof.me</a>. Any refundable amount will be returned after deducting non-recoverable costs and work already completed.</p>

<h2>After work starts</h2>
<p>Deposits reserve capacity and cover discovery, planning and initial work. They are normally non-refundable once that work has started. If we have completed less work than the amount paid, we will explain the calculation clearly.</p>

<h2>Pauses and rescheduling</h2>
<p>You may request a pause or timeline change. We will try to accommodate it, but extended pauses may require a revised schedule or fee if availability, costs or scope change.</p>

<h2>Third-party charges</h2>
<p>Domain, hosting, advertising, software and other third-party charges are separate unless your proposal says otherwise. They are subject to the provider’s own refund rules and may not be recoverable.</p>

<h2>How to request a refund</h2>
<p>Email your request with the project name, invoice and reason. We will acknowledge it within five business days and process any approved refund to the original payment method where possible.</p>""",
    },
    {
        "slug": "cookie-tracking-notice",
        "notice": "Uplof is a service business operated by Abhishek Kumar. For questions about tracking on this website, contact <a href=\"mailto:hello@uplof.me\">hello@uplof.me</a>.",
        "title": "Cookie and Tracking Notice",
        "nav": "Cookies",
        "eyebrow": "Legal / Cookies",
        "desc": "What Uplof stores in your browser and why, how third-party links and analytics are handled, and how to block or delete cookies in your settings.",
        "lead": "A straightforward explanation of cookies and similar technologies used on uplof.me.",
        "body": """<h2>What we use</h2>
<p>Uplof may use strictly necessary storage or cookies to keep pages secure, remember a preference or measure basic site performance. We aim to keep tracking minimal and do not use cookies to sell personal profiles.</p>

<h2>Third-party content</h2>
<p>Links to WhatsApp, phone, email or other sites open services operated by those providers. Their own privacy and cookie policies apply when you leave uplof.me. We do not control their practices.</p>

<h2>Your controls</h2>
<p>You can block or delete cookies in your browser settings. Blocking necessary storage may affect some site functions, but the main pages remain available. If we introduce optional analytics or advertising cookies, we will update this notice and provide an appropriate choice mechanism.</p>

<h2>Questions</h2>
<p>For questions about tracking on this website, email <a href="mailto:hello@uplof.me">hello@uplof.me</a>.</p>""",
    },
]


SENTENCE_KEEP = ("Uplof", "WhatsApp")



def jsonld_for(slug, title):
    """Organization + WebSite on every legal page, plus its own breadcrumb trail.

    LocalBusiness / ProfessionalService is deliberately NOT here yet: its address
    and phone must match the Google Business Profile character for character, and
    that profile does not exist. Publishing a mismatched one is worse than none.
    """
    import json as _json
    graph = _json.loads(SHARED_GRAPH_JSON)
    graph.append({
        "@type": "BreadcrumbList",
        "@id": "https://uplof.me/%s/#breadcrumb" % slug,
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://uplof.me/"},
            {"@type": "ListItem", "position": 2, "name": title, "item": "https://uplof.me/%s/" % slug},
        ],
    })
    return ('<script type="application/ld+json">\n'
            + _json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)
            + '\n</script>')

def sentence_case(text):
    """Title Case -> sentence case, preserving proper nouns."""
    words = text.split()
    out = [words[0]]
    for w in words[1:]:
        out.append(w if w.strip(".,") in SENTENCE_KEEP else w[0].lower() + w[1:])
    return " ".join(out)


def punctuate(text):
    """index.html ends every heading with . or ? — match it."""
    return text if text.rstrip()[-1:] in ".?!" else text.rstrip() + "."


def apply_heading_voice(body):
    """Sentence-case and punctuate every h2/h3 in a body block."""
    def fix(m):
        inner = m.group(2)
        return m.group(1) + punctuate(sentence_case(inner)) + m.group(3)
    return re.sub(r"(<(?:h2|h3)>)(.*?)(</(?:h2|h3)>)", fix, body, flags=re.S)


EFFECTIVE = "Effective 12 September 2026"

# --- the one navbar -------------------------------------------------------
NAVBAR = """  <nav class="navbar" aria-label="Primary">
    <div class="container navbar__inner">
      <a class="navbar__logo" href="/" aria-label="Uplof.me, home">
        <img src="/assets/img/logo-uplof.svg" alt="Uplof.me" width="102" height="65">
      </a>
      <div class="navbar__links">
        <a href="/#journey">Approach</a>
        <a href="/#proof">Proof</a>
        <a href="/#services">Services</a>
        <a href="/#faq">FAQ</a>
      </div>
      <a class="btn btn--ghost btn--sm" href="/#contact">Let’s talk</a>
    </div>
  </nav>"""

# --- the one footer (identical to index.html's, absolute links) -----------
FOOTER = """<footer class="footer on-dark">
  <div class="container">
    <div class="footer__top">
      <a class="footer__logo" href="/" aria-label="Uplof.me, home">
        <img class="footer__logo-anim" src="/assets/img/logo-animated.svg" alt="" aria-hidden="true" width="150" height="96" loading="lazy">
        <img class="footer__logo-static" src="/assets/img/logo-uplof.svg" alt="Uplof.me" width="102" height="65">
      </a>
      <p class="footer__tagline">Websites, search and follow-up, connected.</p>
      <p class="footer__tel"><a href="tel:+917710894943">+91 77108 94943</a></p>
    </div>
    <nav class="footer__nav" aria-label="Footer">
      <a href="/#outcome">Outcome</a><a href="/#leak">The leak</a><a href="/#journey">Approach</a><a href="/#proof">Proof</a><a href="/#services">Services</a><a href="/#process">Process</a><a href="/#faq">FAQ</a>
    </nav>
    <div class="footer__bottom">
      <p class="footer__strap">Get found. Get contacted. Get followed up.</p>
      <p class="footer__legal">© <span data-year>2026</span> Uplof<a href="/privacy-policy/">Privacy</a><a href="/terms-of-service/">Terms</a><a href="/refund-cancellation-policy/">Refunds</a><a href="/cookie-tracking-notice/">Cookies</a></p>
    </div>
  </div>
</footer>"""


def siblings(slug):
    """The other three legal pages, in a fixed order so every page agrees."""
    others = [p for p in PAGES if p["slug"] != slug]
    cards = "\n".join(
        '        <a class="legal-more__card" href="/{s}/">{n}</a>'.format(s=p["slug"], n=sentence_case(p["title"]))
        for p in others
    )
    return """      <div class="legal-more">
        <p class="legal-more__title">More from Uplof</p>
        <div class="legal-more__grid">
{cards}
        </div>
      </div>""".format(cards=cards)


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | Uplof</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://uplof.me/{slug}/">
<meta name="theme-color" content="#d12d34">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Uplof">
<meta property="og:title" content="{title} | Uplof">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://uplof.me/{slug}/">
<meta property="og:image" content="https://uplof.me/assets/img/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Uplof.me — Turn attention into enquiries">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title} | Uplof">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://uplof.me/assets/img/og-card.png">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
{jsonld}
<link rel="stylesheet" href="/css/tokens.css?v={v}">
<link rel="stylesheet" href="/css/base.css?v={v}">
<link rel="stylesheet" href="/css/components.css?v={v}">
<link rel="stylesheet" href="/css/blocks.css?v={v}">
<link rel="stylesheet" href="/css/legal.css?v={v}">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<!-- ========================================================== MASTHEAD -->
<header class="masthead on-brand">
{navbar}
  <div class="container masthead__inner">
    <p class="eyebrow">{eyebrow}</p>
    <h1 class="masthead__title">{heading}</h1>
    <p class="lead masthead__lead">{lead}</p>
    <p class="masthead__meta">{effective}</p>
  </div>
</header>

<!-- ============================================================== BODY -->
<main class="section" id="main">
  <div class="container">
    <div class="prose">
      <div class="notice">
        <p>{notice}</p>
      </div>

{body}
    </div>

{siblings}
  </div>
</main>

<!-- ============================================================ FOOTER -->
{footer}

<script src="/js/site.js?v={v}" defer></script>
<script src="/cookie-consent.js?v={v}" defer></script>
</body>
</html>
"""


def indent(block, spaces):
    pad = " " * spaces
    return "\n".join(pad + ln if ln.strip() else ln for ln in block.split("\n"))


written = []
for p in PAGES:
    html = TEMPLATE.format(
        jsonld=jsonld_for(p["slug"], sentence_case(p["title"])),
        title=p["title"],
        heading=punctuate(sentence_case(p["title"])),
        notice=p["notice"],
        nav=p["nav"],
        slug=p["slug"],
        desc=p["desc"],
        lead=p["lead"],
        eyebrow=p["eyebrow"],
        effective=EFFECTIVE,
        body=indent(apply_heading_voice(p["body"]), 6),
        navbar=NAVBAR,
        footer=FOOTER,
        siblings=siblings(p["slug"]),
        v=V,
    )
    out = os.path.join(ROOT, p["slug"], "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    written.append((p["slug"], len(html)))

for slug, size in written:
    print("wrote {:<32} {:>6} bytes".format(slug + "/index.html", size))


# ---------------------------------------------------------------- 404 ------
# Cloudflare Pages serves 404.html for any unmatched path. Without one it
# serves index.html at HTTP 200, so a typo'd URL silently renders the whole
# landing page. Built from the SAME navbar/footer constants as everything else.
NOT_FOUND = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | Uplof</title>
<meta name="description" content="That page is not here. Find the approach, the proof, the services or a way to get in touch from the links below.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#d12d34">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/tokens.css?v={v}">
<link rel="stylesheet" href="/css/base.css?v={v}">
<link rel="stylesheet" href="/css/components.css?v={v}">
<link rel="stylesheet" href="/css/blocks.css?v={v}">
<link rel="stylesheet" href="/css/legal.css?v={v}">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<header class="masthead on-brand">
{navbar}
  <div class="container masthead__inner">
    <p class="eyebrow">Error 404</p>
    <h1 class="masthead__title">Page not found.</h1>
    <p class="lead masthead__lead">That link has moved or never existed. Nothing is broken on your end — here is the way back.</p>
  </div>
</header>

<main class="section" id="main">
  <div class="container">
    <div class="prose">
      <p>If you were looking for something specific, these are the places most people want:</p>
    </div>

    <div class="legal-more">
      <p class="legal-more__title">Go to</p>
      <div class="legal-more__grid">
        <a class="legal-more__card" href="/">The home page</a>
        <a class="legal-more__card" href="/#proof">What it has produced</a>
        <a class="legal-more__card" href="/#contact">Ask for a walkthrough</a>
      </div>
    </div>
  </div>
</main>

{footer}

<script src="/js/site.js?v={v}" defer></script>
<script src="/cookie-consent.js?v={v}" defer></script>
</body>
</html>
"""

with open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8") as fh:
    fh.write(NOT_FOUND.format(navbar=NAVBAR, footer=FOOTER, v=V))
print("wrote 404.html")
