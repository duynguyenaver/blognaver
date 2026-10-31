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


## Article controls and TOC lanes — 2026-10-30
Public headers have no Search or theme controls; remove their markup and custom injection, not merely their visibility. Public pages use light mode, independent of previously stored dark preferences. Article layouts use a 720px reading column plus a 260px in-flow sticky TOC with a 48px gap at 1200px and above. The entire article, including H1, category/Series metadata and footer, stays in the reading column. Below 1200px, the static in-article TOC is available instead. Long labels wrap; tables scroll within the article. Avoid absolute/fixed TOC positioning and artificial H1 margins used to dodge removed controls.


## Minimal red brand mark — 2026-10-30
Header branding uses a solid #bc002d circle, 14px diameter, 50% radius and 8px spacing before “Duy Nguyen”. Render it in the desktop and mobile header templates; center with inline-flex and prevent shrinking. The decorative dot is aria-hidden. Remove the former DN badge and its JavaScript injection. This owner-approved logo accent is an exception to the blue interface palette.


## Comprehensive editorial stylesheet — owner update 2026-10-30
`static/css/blog-editorial.css` consolidates the former pills, card polish and article typography styles. Current palette: white surfaces, #334155 prose, #0f172a headings, #f1f5f9 / #cbd5e1 pills and #1e3a8a pill text. The red logo is now 12px with 8px spacing; use the existing decorative span once, never add a duplicate pseudo-element. Public site headers are sticky translucent white with an 8px backdrop blur. Body text is 18px/1.75 in the 720px reading lane. Cards use 12px radius, 24px desktop padding and subtle shadows; only listing cards lift on hover, respecting reduced motion. Preview/featured images use 16:9 while prose diagrams retain natural proportions. Quotes use a red left rule; inline code is light and preformatted blocks slate-dark. Keep one TOC panel in its own desktop grid lane, static in the article below 1200px; never float both the TOC and its nested nav. Scope these editorial styles to public content; preserve app forms, resume print and data behavior. This section supersedes earlier 14px/rounded-rectangle pill rules.


## Left slide-out article TOC — owner update 2026-10-31
Article detail pages now use one centered 900px frame with 20px internal padding and justified paragraphs at 1.8 line height. Above 1024px, the outer `#toc-auto` panel (or `#toc-static` only when no auto panel exists) is fixed to the left, centered vertically, and translated offscreen except for a 12px red right edge. Hover or keyboard focus within the panel reveals it. Keep the nested TOC nav static; never create multiple floating surfaces or labels. At 1024px and below hide TOCs and left-align paragraphs with 16px internal padding. Respect reduced motion and hide TOCs in print. This supersedes the earlier right-side reserved TOC lane; listing cards and app pages retain their layouts.

## Editorial utility alignment (2026-10-31)
- Attendance, vocabulary, journals and interview tracking share `static/tien-ich/editorial-ui.css` and `editorial-ui.js`: white Bento surfaces, 16px corners, #334155 copy, #bc002d focus/accent, 1.8 line height. Functional calendar cells retain compact corners.
- Use `BNFeedback.toast` only after local storage commits successfully; GitHub confirmation remains a separate status. Never infer remote success from a local write.
- Diary heatmaps use real entries over the most recent 365 days, Monday-first columns (53 columns including partial boundary weeks), with levels #f1f5f9 / #fca5a5 / #ef4444 / #dc2626 / #bc002d.

## Resume editor and A4 typography (2026-10-31)
Resume CMS uses 16px cards, 44px controls, associated labels and full-width multiline experience descriptions. The shared preview/published stylesheet prints a 186mm content lane on A4 (10mm vertical / 12mm horizontal margins), 11pt narrative text at 1.5 line height and 10pt table data. Personal-info columns reserve space for the portrait; long email addresses wrap inside the cell. Short entries stay together while long essays can continue on another page. Hide utility chrome, preserve the document title.

## CMS V2 viewport layout (2026-10-31)
The standalone `.cms-v2-app` shell uses the dynamic viewport height on desktop, with separate scrolling for navigation, workspace, document body and metadata. Keep the action bar inside the workspace at top:0; never reuse the old page-level 66px sticky offset inside that scroll region. At short desktop heights the workspace remains scrollable. Narrow/mobile layouts use natural document flow for virtual keyboards. Hidden Markdown source must have min-height:0 and a 1px clipped box positioned inside `.editor-main`; it must not inherit the visible editor's minimum height or create trailing overflow. Scope layout CSS to CMS V2, preserving CMS V1/public UI.
