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
