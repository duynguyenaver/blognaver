# BlogNaver Design System (v1.0)
Last reviewed: 2026-10-28
Public guide: https://duynguyenaver.github.io/blognaver/branding/

## Non-negotiable standards
- Current owner preference: DoIt theme, always-light public blog, bold uppercase editorial navigation, existing blue accents. Theme UI may be changed freely on request.
- Brand palette: background #10172F, card #1C2747, primary text #EDF3FF, muted text #A9B8D7, accent blue #397BE0, link blue #70B6F8.
- Border rgba(150,177,223,.22), surface #1C2747. Colors are BlogNaver design decisions, not claimed pixel-exact N9O extraction.
- Typography: Inter, Be Vietnam Pro, system UI; Vietnamese support; body 16px, line-height 1.7–1.85; editorial headings bold.
- Header fixed; homepage background hero, profile, cards of up to 12 recent articles. Navigation: About / Posts / Projects / Resume / Search.
- Long-form reading width ~76ch; clean content hierarchy, breadcrumbs, TOC, reading time, related links.
- 8px spacing scale (8,12,16,24,32,48,64), moderate rounded corners, subtle borders, no excessive visual effects.
- Mobile responsive, touch target >=44px, focus-visible, reduced motion, semantic inputs/labels and inline error states.
- Target WCAG AA 4.5:1 text contrast and 3:1 for large text.
- Do not alter business logic, data sync, CMS saves, publication URLs, or PDF print output when doing appearance-only work.
- Do not expose GitHub tokens/credentials, never put them in code or commits.
- Compare desktop/mobile, dark/light, accessibility and Actions build before claiming success.
- Update this file and public guide when changing design tokens or rules.
- Never claim 100% pixel match without comparative screenshots at the same viewport.
Implementation: assets/css/custom.css; config/_default/params.toml; languages.vi.toml; menus.vi.toml.

## Palette correction (2026-10-28)
Do not use neon/pink/magenta/violet as primary or secondary website accents. Use custom Blowfish scheme `assets/css/schemes/blognaver-blue.css`; colorScheme must remain `blognaver-blue`. This explicitly supersedes earlier purple Neon guidelines. Reference is N9O navy + royal blue + bright cyan link treatment.

## Header contrast hotfix (2026-10-28)
Header/nav text and icons must remain #F8FBFF on dark/navy/blue hero and transparent header backgrounds in both theme appearances; hover/focus #B9E7FF. Never use dark menu text over dark backgrounds. Keep a visible keyboard focus outline.

## Animated article background (2026-10-28)
- Original artwork: `assets/images/blognaver-aurora.svg` (navy/royal-blue/cyan fluid light and animated ribbons).
- Applied through Blowfish `defaultBackgroundImage` and `homepage.homepageImage` in `config/_default/params.toml`; `backgroundCanvas = true` enables Blowfish background canvas treatment.
- Do not use the N9O SVG itself. Keep this original BlogNaver asset and the approved blue color palette.
- Preserve reduced-motion preferences: SVG animations are disabled when `prefers-reduced-motion: reduce`.
- Confirm background renders on homepage and article pages after GitHub Pages deployment.

## Current owner override — 2026-10-29

The current Hugo theme is DoIt, not Blowfish. The site should remain in light mode with no visible public theme switch; main navigation should be uppercase and bold while retaining its existing text colors. Previous dark-first/Blowfish requirements above are retained for historical context only and are not blocking requirements. Owner-requested theme and layout changes are permitted. Validate the active `layouts/baseof.html` integration and production rendering before claiming completion.

## Shared utility UI and UX contract (2026-10-30)
- Reusable disclosure sections: secondary/configuration sections closed by default, visible chevron and semantic `<details>/<summary>` or equivalent keyboard-accessible control. Primary task, required actions and urgent notices remain visible.
- Cloud connection settings collapse automatically after a verified successful save, with persistent status outside the disclosure; failures reopen the section.
- Consistent blue palette, text hierarchy, compact forms, progress/error/success states, mobile tap targets, focus-visible, reduced-motion and accessible contrast. Feature-specific exceptions are allowed when documented and justified.
- Data/identity behavior is specified in AGENTS.md: one remembered device credential per provider, GitHub-first personal data, encrypted private cloud records, bounded IndexedDB fallback and honest sync evidence.
- Every new utility must follow the common patterns and test both first use and returning-device use. Documentation does not imply existing pages were automatically migrated.

## Editorial pill and metadata system (2026-10-30)

Public article metadata, Series labels, category/tag badges and article-list cards use a unified quiet blue pill language. Implementation: `static/css/blog-editorial-pills.css`. Use 8px rounded labels, 1px subtle border, translucent blue-grey surface, navy typography, 13px aligned icons, 6–8px metadata gaps, and restrained card shadows. Avoid applying editorial badge rules to CMS or utilities. Preserve dark-theme contrast, keyboard focus and mobile wrapping. Changes to tokens require updating this section.
