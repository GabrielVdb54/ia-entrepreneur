# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing/blog site for **IA-Entrepreneur** (ia-entrepreneur.fr), a Qualiopi-certified training organization (brand of Clindit SASU) offering business-creation coaching and company AI training (ChatGPT, n8n/Make automation, prospection, management, sales, etc.). No frontend framework, no bundler, no `package.json` — plain HTML/CSS/JS files deployed as-is (Vercel, per `vercel.json`, which redirects `www` → apex domain).

`llms.txt` at the repo root is the canonical, up-to-date summary of the business (offer, legal info, contact) — read it for business context instead of asking.

## Architecture

- **Every page is a self-contained `.html` file** — no shared header/footer include, no templating engine. The `<style>` block (design tokens as CSS custom properties: `--bg`, `--primary`, `--accent`, `--text`, etc., font: Inter via Google Fonts) is duplicated inline in each page. `mobile.css` is the only shared stylesheet, linked separately for responsive overrides.
- **Landing pages** live at the repo root (`index.html`, `formations-entreprises.html`, `formations-creation.html`, `formateur-*.html`, `integration-*.html`, etc.) — one file per offer/page, no routing.
- **`blog/`** holds one HTML file per article (~90 articles). `blog.html` at the root is the paginated/filterable index of article cards, generated from the files in `blog/`.
- **Blog pipeline is automated via n8n**, not run locally in normal dev flow:
  - New articles are generated and pushed by an external n8n workflow (see recent git log: `Auto: Nouvel article ...` / `auto: carte blog ...` / `auto: sitemap ...` commits, often merge commits from n8n's own branch).
  - `n8n_*.js` / `n8n_system_message.txt` / `n8n_preparer_prompt.js` in the repo root are **copies of the n8n workflow's Function-node code and prompt**, kept here for reference/version control — they don't run as part of a local build.
  - `n8n_generer_html_article.js` builds the full article HTML (SEO meta, OG/Twitter tags, JSON-LD `Article` schema, hero image from Supabase storage `srmmlwvumrqcpdwwrxjh.supabase.co`).
  - `n8n_maillage_interarticles.js` inserts internal links between articles by keyword/topic similarity.
  - `n8n_preparer_prompt.js` embeds hard 2026 facts (micro-entreprise thresholds, IS rates, etc.) that must never be invented — treat this file as the source of truth for stats used in article generation.
- **`meilleures-ia.html` + `ia/` + `data/` are the AI directory ("Les meilleures IA du moment")** — the only generated, regenerable part of the site:
  - `data/ia-tools.json` (129 tools) and `data/ia-categories.json` (16 usage categories) are the source of truth. Edit these, never the generated HTML.
  - `python3 generate_ia_pages.py` regenerates `meilleures-ia.html` (hub with search/filters/selector), `ia/<tool>.html` (one static sheet per tool), `ia/meilleures-ia-<category>.html` (one page per usage), `ia-annuaire.css` (shared stylesheet for those pages, extracted from `index.html`'s own rules so the header/footer stay identical), `ia-annuaire.js` (favourites in `localStorage` + share button, shared by all directory pages), and rewrites the directory's entries in `sitemap.xml`.
  - **All directory content is static HTML on purpose**: the JS only filters/hides cards that are already in the markup. This is the point of the whole thing vs. competitors whose directories are JS-rendered and therefore invisible to Google and to AI crawlers (see the `nos-formateurs.html` bug for the same failure mode).
  - `python3 generate_og_images.py` regenerates the 146 Open Graph cards in `images/og/` (Pillow + system fonts, no browser). Run it before `generate_ia_pages.py` when you add a tool or a category, otherwise the new page points at a missing image.
  - `add_annuaire_links.py` (nav/mobile menu/footer link on every page) and `add_annuaire_callouts.py` (in-article callouts on 11 blog posts) are idempotent and only need rerunning if new pages appear.
  - Metadata is generated under hard limits: titles ≤ 60 characters, descriptions ≤ 158, all unique across the 146 pages. `titre_seo()` / `description_seo()` in the generator pick the longest variant that fits — keep using them rather than hardcoding a title.
  - `python3 veille_annuaire.py` is the monthly watch: it re-fetches every editor URL (telling a dead link apart from a Cloudflare 403, and a rebrand from a login redirect), scrapes each editor's pricing page (~64/129 are readable; the rest go to a manual rotation list), and diffs the competitor catalogue at avantagedigital.fr/bible-des-ia. State lives in `data/veille-annuaire.json` — only differences since the last run are reported. It runs by itself through `.github/workflows/veille-annuaire.yml` (1st of each month, 07:00 UTC, also launchable by hand from the Actions tab): the workflow opens a GitHub issue when there is something to act on, and otherwise just commits the new reference state. `--markdown` produces the issue body, `--code-sortie` exits 1 when something needs attention. Crawled their 135 pages on 2026-09-04: **their site publishes no tool pricing at all**, so it is a coverage signal only, never a tariff source.
  - Tool ratings are editorial (`note` /5) and tariffs are indicative — the pages say so explicitly. No affiliate links anywhere in the directory; keep it that way.
- **Navigation is generated, not hand-edited**: `simplifier_nav.py` rewrites the `<nav>` and mobile menu of every root and blog page from a single source of truth (4 links + phone + Appel gratuit); `generate_ia_pages.py` holds the same lists (`NAV_ITEMS` / `MENU_MOBILE`) for the directory pages. Change the nav in those two places and rerun both, never page by page. `ajouter_cta_financement.py` places the financing-simulator CTA inside the Financement sections and in the default tab of `formations-entreprises.html`.
- **Root-level Python scripts are one-off maintenance/migration tools**, run manually and individually (not a pipeline, no orchestrator):
  - `generate_blog.py` — regenerates `blog.html` cards from the articles in `blog/`. Run from the repo root: `python3 generate_blog.py`.
  - `add_internal_links.py` / `add_inter_article_links.py` — Python equivalents of the n8n internal-linking logic (max 3 links/article, only inside `.article-body`, never in headings or existing `<a>` tags, first keyword occurrence only).
  - `fix_*.py`, `update_*.py`, `seo_final.py` — historical scripts that patched nav/mobile layout/pricing/SEO across many pages at once via regex/string replacement on the raw HTML. Check the script before rerunning one — most were written for a specific one-time fix and assume the HTML state at the time they were authored.
- **`robots.txt` explicitly disallows `*.py`, `.git/`, `.DS_Store`** — Python scripts are dev tooling only, never meant to be served.
- Images are split between local `images/` (site chrome: logos, formateur photos) and Supabase storage (auto-generated blog article hero images).

## Working in this repo

- There is no build/lint/test command — verify HTML changes by opening the file directly or via a static server (e.g. `python3 -m http.server`).
- When adding/editing a page, match the existing pattern: inline `<style>` block with the same CSS variable names, GA4 snippet (`G-SZG9XPNNNC`), canonical/OG/Twitter meta tags, and JSON-LD where applicable (see `blog/business-plan-guide-complet-2026.html` as a reference article, or `index.html` for a landing page).
- After adding a blog article manually (rare — normally n8n does this), run `python3 generate_blog.py` to refresh `blog.html`, and update `sitemap.xml` to keep it consistent with the git-log automation pattern (`auto: carte blog ...` + `auto: sitemap ...`).
- Don't add a JS framework, bundler, or shared templating system unless explicitly asked — the whole site intentionally has zero build step.

## Sending email on behalf of this project

Emails about IA-Entrepreneur should come from `gabriel@ia-entrepreneur.fr`, not
from `gabriel@clindit.com` (the parent company's address, wrong on anything
IA-Entrepreneur-branded: trainers, prospects, clients, partners).

**This is currently not possible, so ask Gabriel before sending.** The Gmail
connector sends from the connected account's default send-as address and exposes
no `from` parameter, and `gabriel@ia-entrepreneur.fr` is a separate Google mailbox
(not an alias of the Clindit one). SendGrid can set the sender explicitly, but as
of 2026-09-04 only `clindit.com` is domain-authenticated there — `ia-entrepreneur.fr`
is not, and no single sender is verified, so it rejects that address with a 403.
Fixing it would mean authenticating the domain in SendGrid (3 CNAME records);
Gabriel has chosen not to, for now.

So: never send an IA-Entrepreneur email on the assumption it will look right.
Say which address it would actually leave from, and let Gabriel decide.

To check what an already-sent message used: `get_message` with
`messageFormat: "METADATA_ONLY"` returns the `sender` field.
