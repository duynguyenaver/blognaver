# BlogNaver Agent Guidelines

Before modifying UI/UX or building a new page, read [BRANDING.md](BRANDING.md) and the published /branding/ style guide.

Required: follow the design tokens, typography, responsive standards, accessibility and CMS behavior constraints there. Preserve existing functionality unless specifically requested. Update design docs alongside deliberate changes to brand rules. Check Hugo build and GitHub Pages deploy after changes; report real status without guessing.

Project: Hugo + Blowfish 3, GitHub Pages via .github/workflows/hugo.yml, canonical baseURL https://duynguyenaver.github.io/blognaver/.

Brand color correction: **Blue only** (navy + royal blue + cyan links). Never restore purple/pink Neon scheme. Official palette and implementation are in BRANDING.md and assets/css/schemes/blognaver-blue.css.


## Safe automatic conflict repair

Workflow `.github/workflows/safe-conflict-fixer.yml` listens on same-repository pull requests. It auto-repairs **only** the verified Stack footer modify/delete conflict when the PR switches to Blowfish. It checks the module import, verifies the obsolete footer exists on main but is intentionally deleted on the PR, verifies this is the **only** merge conflict, retains the Blowfish `extend-footer.html` and Commit Status dashboard, then pushes a normal fast-forward merge commit on the PR branch. It never merges to `main`, never force-pushes, and never approves a PR.

Other conflicts are intentionally left for human resolution to avoid deleting recent work. Bug Checker must pass after any auto-fix and the owner must manually review and merge.
