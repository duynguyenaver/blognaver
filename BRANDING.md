# BlogNaver Design System (v1.0)
Last reviewed: 2026-10-28
Public guide: https://duynguyenaver.github.io/blognaver/branding/

## Non-negotiable standards
- Use Blowfish 3, dark-first Neon editorial visual language. Inspired by n9o.xyz; preserve BlogNaver's distinct brand.
- Brand palette: background #0D1023, card #12162B, primary text #EDF3FB, muted text #B6BFD2, accent violet #C49CFF, accent cyan #67D4EB.
- Border rgba(189,201,234,.20), glass surface rgba(18,22,43,.69). Colors are BlogNaver design decisions, not claimed pixel-exact N9O extraction.
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
