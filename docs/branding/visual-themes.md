# BlogNaver visual themes

## Mode A — Editorial
Existing BlogNaver editorial branding: light reading layout, original blue accents, familiar article templates.

## Mode B — HB Style (HB Starter-inspired)
An alternate visual skin inspired by HB Starter Theme and Bootstrap 5.3 aesthetics, using current Hugo templates. This is NOT the original HB Hugo module; migrating Hugo engines is a separate operation.

Reference: https://jamstackthemes.dev/demo/theme/hugo-hb-theme/
HB framework docs: https://hbstack.dev/docs/getting-started/

### Branding tokens
- Primary: #0D6EFD (links, accents, selected navigation)
- Ink: #233449 (body and headings)
- Muted: #62758D (metadata)
- Background: #F5F7FB (page)
- Surface: #FFFFFF (cards and reading panel)
- Borders: #E2E8F0 (quiet separation)

### UI/UX principles
- Bootstrap-like modular cards, 14–16px rounded corners, subtle shadows and readable typography.
- System sans typography, generous whitespace, restrained accents, no distracting banners.
- Mobile-first: single column on small screens; preserve tap targets, keyboard focus and reduced motion.
- Keep article metadata, Series and TOC legible. Avoid overlap and horizontal scrolling.
- Avoid changing CMS/utility tool functionality: this alternate skin applies to pages rendered by Hugo baseof layout.

### Switch
Two options: Editorial (default) and HB Style. The switch is fixed at bottom right of public Hugo pages, keyboard accessible, and persists with localStorage key blognaver_visual_theme_v1 on the same browser.

### Files
- static/css/hb-inspired-theme.css: HB Style CSS scoped to html[data-bn-visual-theme=hb]
- static/js/visual-theme-switcher.js: switcher, preference persistence
- layouts/baseof.html: shared asset links

### Limitations
This is a visual theme, not a runtime Hugo theme/module swap. It does not install HB Starter or HB-specific modules (PWA, search, Bootstrap utilities). Those would require a separate technical migration and tests.

### Acceptance checklist
- Hugo build and publish workflow pass.
- Homepage, post list, article, Series, tags, categories, archive and pagination are readable in both modes.
- TOC does not overlap main body at different desktop/tablet/mobile widths.
- Theme persists after reload; keyboard and touch work; independent static utilities remain unchanged.