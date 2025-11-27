# Becka Companion – Multifamily Assistant

This repository contains the Becka conversational companion and a Vite + React + Tailwind app under `syndicate-pro/`. Becka is a sleek, minimalist chat UI with voice and file uploads (PDF/XLSX) that performs quick/detailed analysis for multifamily underwriting.

## Structure

- `scaffold.py` – Python generator used to create the project files
- `syndicate-pro/` – Web app source
  - `package.json`, `vite.config.js`, `tailwind.config.js`
  - `index.html`
  - `src/` with `main.jsx`, `App.jsx`, `index.css`
  - `.gitignore`

## Deployment (GitHub Pages)

This repo includes a GitHub Actions workflow to deploy the site to GitHub Pages.

Steps:
- Push to a GitHub repository on the `main` branch.
- In GitHub, go to `Settings → Pages` and set Source to `GitHub Actions`.
- The workflow `.github/workflows/pages.yml` builds the app and publishes the site.

Live URLs (after deployment):
- Becka Companion: `https://<your-username>.github.io/<repo>/ani.html`
- App index: `https://<your-username>.github.io/<repo>/`

## Local Development

1. `cd syndicate-pro`
2. `npm install`
3. `npm run dev` → `http://localhost:5173/`

## Notes

- Becka uses WebLLM, PDF.js, and XLSX via CDNs and runs fully client-side.
- Analysis assumptions (cap rate, DSCR, LTV, interest, amort) persist in `localStorage`.