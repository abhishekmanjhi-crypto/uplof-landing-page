# Sveltia CMS auth Worker

Deployed 22 September 2026.

| | |
|---|---|
| URL | https://sveltia-cms-auth.it24-santosh-satyam.workers.dev |
| Source | https://github.com/sveltia/sveltia-cms-auth (unmodified) |
| Config change | `ALLOWED_DOMAINS = "uplof.me"` in `[vars]` |

The only edit to upstream is `ALLOWED_DOMAINS`. Without it, any site on the
internet could point its CMS at this Worker and authenticate through your OAuth
app. Verified after deploy: a request claiming `uplof.me` passes the domain
check, one claiming another domain is rejected with `UNSUPPORTED_DOMAIN`.

## To redeploy or update it

```bash
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
printf '\n[vars]\nALLOWED_DOMAINS = "uplof.me"\n' >> wrangler.toml
npx wrangler deploy
```

The two secrets are set in the Cloudflare dashboard and are not in any file:
`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
