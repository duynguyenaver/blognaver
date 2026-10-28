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

## Site Manager — menu and section editing (2026-10-28)

URL: https://duynguyenaver.github.io/blognaver/cms/site-manager/

From BlogNaver Studio, select **Quản lý Menu & Section**.
- **Menus:** edit labels and page references, toggle visibility, change order, add new menu items, preserve built-in Search, preview and commit the modified `config/_default/menus.vi.toml`.
- **Sections:** discover Hugo section/page index Markdown files (e.g. homepage, posts, about, projects, branding, tags), open a page and edit title, description, and ordinary text with a WYSIWYG editor. Existing front matter keys are preserved. Complex pages with Hugo shortcodes or special HTML are metadata-only to prevent content damage.
- **Publishing:** each save writes to `main` using GitHub Contents API with the current file SHA for concurrency conflict protection. GitHub Actions then builds and deploys the result; the public website does not update until this succeeds. The Studio reports the commit and links to Actions.
- **Security:** use a repository-scoped PAT in tab memory only. Do not include it in Git or email.
- **Scope:** this manager supports file-backed menus and Markdown sections. Arbitrary theme template regions, hardcoded footer widgets, static CMS code, custom layouts, and binary media are not fully editable with this initial GUI. Edit those via code or a future dedicated component manager.
- **Best practice:** after saving, check Actions and verify the public page. Page content is converted from Markdown to HTML and back; complex Markdown syntax may not round-trip precisely, so review changes for legacy pages.

## Automatic SEO and estimated score (2026-10-28)

The Studio **SEO & mô tả** section now provides **Tự động SEO** (enabled by default) and an estimated SEO score out of 100. It runs in the browser, needs no paid API and sends no article content to a classification service.

- As title/body are edited, it proposes Vietnamese metadata from the actual text, canonical categories and relevant tags.
- Auto-generated description aims for 110–160 characters when enough source text is available. If insufficient, the score flags the missing length; it never invents facts to pad text.
- Manual edits take precedence. Existing metadata is preserved when opening saved articles. Turning auto mode off stops generation. Turn it back on to apply suggestions to empty or previously system-generated fields.
- The estimated score checks 10 weighted rules totaling 100: title (15), description (20), slug (10), category (10), tags (5), content >=300 words (15), heading (10), link (5), cover (5), content >=600 words (5).
- This is a content readiness heuristic, **not** a Google ranking score, PageSpeed score, search-result position or ranking prediction.
- Publishing still requires a successful GitHub Actions deployment.

## Smart Insights & CMS Activity — 2026-10-28

- Dashboard: `/cms/insights/`; also linked from the Studio sidebar.
- After the GitHub Contents API confirms a successful *publish* commit, Studio redirects to Smart Insights. A draft-save stays in the editor.
- The dashboard reads public GitHub Actions workflow runs, lists source Hugo posts from `main`, and computes article totals, front-matter draft/published states, average words, image/tag coverage and category distribution from readable page bundles. It auto-refreshes every 90 seconds while visible. GitHub unauthenticated API rate limits can interrupt refresh; these are source metrics, **not actual live traffic, Google Analytics or confirmed public URLs**.
- The previous published commit SHA is retained temporarily in **sessionStorage** to match its workflow and indicate queued/running/success/failure. A successful commit does **not** imply successful deployment.
- The Activity section, below analytics, records publish attempts, confirmed GitHub publishes/draft saves, edits, previews, navigation and image actions from this browser only in **localStorage**, limited to 200 events. No token or body text is logged. It is not a server-side audit log and does not merge actions from other devices; clearing browser data clears this history.
- For true cross-device complete audit trails, a separate authenticated backend or a repository-backed event log is needed. Do not claim the local log covers every action everywhere.

## Paste-to-table support (2026-10-28)

- In BlogNaver Studio editor, paste a real HTML table from Word/ChatGPT or tab-separated rows from Excel/Sheets. A custom Quill table embed displays a structured table rather than flattening it into paragraphs.
- The **Chèn bảng** button also accepts tab-separated text, pipe-delimited Markdown tables and a vocabulary list headed by `Tiếng Hàn / Tiếng Việt / English` with a number of entries divisible by three.
- On publishing, the CMS converts the embedded table to a GitHub-flavored Markdown pipe table for Hugo/Blowfish rendering. Vertical overflow is avoided with horizontal scrolling for narrow screens.
- This handles simple rectangular tables. Merged rows/columns, nested tables, complex embedded HTML and arbitrary text with ambiguous column boundaries still require manual review.
- Hotfixed the KAI privatization post: the 14 Korean–Vietnamese–English vocabulary entries are now a genuine three-column Markdown table.

## Shared GitHub login and Insights inventory — 2026-10-28

- CMS, Site Manager and Smart Insights use `/cms/shared-auth.js`. On the **Ghi nhớ** option, the fine-grained GitHub PAT is retained in this browser's localStorage; otherwise it lives only in sessionStorage. A stored login survives refresh and can be reused on the same device/browser and origin. Clicking **Ngắt GitHub** clears both storage copies.
- **Security warning:** browser-local persistence is not encrypted against scripts running on the same origin. Use a repository-scoped, minimum-permission token only on a trusted private device; avoid shared machines. Clearing site data also removes the login. No token is committed into source files.
- Smart Insights reuses the CMS credential for authenticated GitHub Actions requests and can work without one for its static post index. The user need not re-enter a token on that dashboard.
- The complete article list is generated during Hugo deployment by `node scripts/generate-cms-index.mjs` into `public/cms/posts-index.json`, including drafts. This prevents one GitHub API 403 from truncating the list to whatever individual files happened to load successfully. The index reflects the most recently deployed commit; cached data is used if temporarily offline.
- GitHub Actions API rate limits are handled via workflow caching and a backoff period. Workflow state and article index refresh independently.
