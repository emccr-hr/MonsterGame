# 0006: Deploy as a static site, on release tags only

**Decided 2026-11-21 (proposed; confirm the host when the repo's final home is known).**
`npm run build` makes a static `dist/` folder. Deploy it to GitHub Pages from a `deploy.yml` that runs **only on `v*` tags** (about 1 minute per release). If the repo moves to a private account on the free plan, use Cloudflare Pages or Netlify instead (free static hosting, builds outside GitHub Actions minutes).
Saves use browser storage (`localStorage`), with an export/import save-file button as a backup.
