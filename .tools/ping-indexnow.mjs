/**
 * Tell search engines a page changed, without waiting for a crawl.
 *
 * IndexNow is a shared endpoint: one POST notifies Bing, Yandex, Seznam, Naver
 * and the others that adopted it. Google has said it is evaluating IndexNow but
 * does not use it, so this does NOT push anything to Google — see the note at
 * the bottom for what actually works there.
 *
 * Ownership is proved by hosting a key file at the site root. The key is public
 * by design; it is not a secret and nothing is protected by it.
 *
 * Run after a deploy:  npm run ping
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const HOST = "uplof.me";
const KEY_FILE = path.join(HERE, "indexnow-key.txt");

// One key, generated once and kept. Rotating it means re-hosting the file and
// re-proving ownership, so there is no reason to.
let key;
if (existsSync(KEY_FILE)) {
  key = (await readFile(KEY_FILE, "utf8")).trim();
} else {
  key = crypto.randomBytes(16).toString("hex");
  await writeFile(KEY_FILE, key + "\n");
  console.log("  generated a new IndexNow key");
}

// The public proof-of-ownership file. Written into the site root so it deploys
// with everything else.
await writeFile(path.join(ROOT, `${key}.txt`), key + "\n");

// Submit whatever is in the sitemap. That is already the authoritative list of
// what should be indexed, so there is no second place to keep in sync.
const sitemap = await readFile(path.join(ROOT, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (!urls.length) {
  console.log("  no URLs in sitemap, nothing to submit");
  process.exit(0);
}

const body = { host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls };

try {
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 and 202 both mean accepted. 422 usually means the key file is not
  // reachable yet, which happens if this runs before the deploy finishes.
  if (res.status === 200 || res.status === 202) {
    console.log(`  IndexNow: submitted ${urls.length} URLs (${res.status})`);
  } else if (res.status === 422) {
    console.log("  IndexNow: 422 — key file not reachable yet. Deploy first, then run npm run ping");
  } else {
    console.log(`  IndexNow: ${res.status} ${res.statusText}`);
  }
} catch (err) {
  // Never fail a publish because a notification did not go through.
  console.log(`  IndexNow: could not reach the endpoint (${err.message})`);
}

// For Google specifically: the old sitemap ping endpoint was retired in 2023,
// and the Indexing API is limited to job postings and broadcast events. There
// is no supported way to push an ordinary page instantly. What works is having
// the sitemap submitted once in Search Console — Google re-reads it on its own
// — plus URL Inspection > Request Indexing by hand when something is urgent.
