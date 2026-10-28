# BlogNaver Studio — Visual CMS

URL: https://duynguyenaver.github.io/blognaver/cms/

## Architecture
- Hugo + Blowfish continues rendering all articles from `content/posts/<slug>/index.md`.
- CMS is a static client-only page at `static/cms/`. It uses Quill 2 (WYSIWYG), Turndown (HTML to Markdown), Marked (Markdown to HTML for editing), DOMPurify (sanitize preview/import), and GitHub Contents API.
- No server or database. The browser commits content to `main`; the existing GitHub Actions workflow builds and deploys the site.
- New articles are editable without writing Markdown; Hugo still stores Markdown behind the scenes.

## Workflow
1. Visit /cms/ and select **Kết nối GitHub**.
2. Paste a fresh GitHub Personal Access Token restricted to `duynguyenaver/blognaver`, with Contents: Read and write. Do not paste a token into chat. It is kept in tab memory only.
3. Type title, slug, category, summary, tags, cover image and rich text body. Auto-save stores non-secret draft data in browser localStorage.
4. Click **Xem trước** to inspect the draft.
5. **Lưu bản nháp** creates a GitHub commit with `draft: true`; it does not publish to Hugo output.
6. **Xuất bản** commits the page with `draft: false`. GitHub Actions deploys; the URL becomes `/bai-viet/<slug>/` after a successful run.
7. Select an existing folder in the sidebar to edit. Content with Hugo shortcodes is intentionally blocked in the visual editor to avoid destructive conversion.

## Current limitations
- CDN libraries must load (Quill, Turndown, Marked, DOMPurify).
- Image uploads limited to 2 MB per image; stored publicly under `static/uploads`. Avoid confidential content.
- Automatic browser draft save uses localStorage (content only), not a cross-device cloud draft. Draft save to GitHub is explicit.
- Legacy Hugo Markdown with special syntax may lose custom constructs if converted to rich HTML; verify preview and diff before publishing.
- This static editor route is publicly accessible. GitHub Contents write permissions protect publishing, not viewing the editor. Never commit secrets.
- Multiple editors should not edit the same post simultaneously. The API uses blob SHA as a version check to prevent stale overwrites.
- GitHub Actions must finish before changes are visible on production.

## Maintenance
Follow `BRANDING.md` and `AGENTS.md`. Do not change Resume CMS or deployment logic as part of BlogNaver Studio changes.
