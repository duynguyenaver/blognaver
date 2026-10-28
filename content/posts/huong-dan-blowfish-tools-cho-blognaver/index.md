---
title: "Blowfish Tools là gì? Hướng dẫn sử dụng đúng cách cho BlogNaver từ A đến Z"
date: 2026-10-28T11:40:00+07:00
draft: false
slug: "huong-dan-blowfish-tools-cho-blognaver"
description: "Hướng dẫn sử dụng Blowfish Tools với BlogNaver chạy Hugo Modules và GitHub Pages: cài CLI, tùy chỉnh theme, xem trước, cập nhật an toàn và deploy qua GitHub Actions."
summary: "Dùng Blowfish Tools để thử cấu hình giao diện, kết hợp Hugo Modules, Git và GitHub Actions mà không làm mất branding hoặc chức năng CMS."
categories: ["Công nghệ", "Hướng dẫn"]
tags: ["Hugo", "Blowfish", "Blowfish Tools", "GitHub Pages", "GitHub Actions", "BlogNaver", "CLI"]
showTableOfContents: true
---

**Blowfish Tools** là công cụ dòng lệnh (CLI) hỗ trợ tạo và cấu hình website Hugo sử dụng theme Blowfish. Nếu đang có một website giống như **BlogNaver**, công cụ này giúp thử các tùy chọn về homepage, header, footer, tác giả, danh mục và bố cục bài viết mà không phải tìm thủ công tất cả khóa cấu hình.

Nhưng cần hiểu đúng: **Blowfish Tools không phải CMS, không thay thế Hugo và cũng không chịu trách nhiệm deploy lên GitHub Pages.** Đây là công cụ phục vụ giai đoạn phát triển giao diện.

> Bài này được viết cho cấu trúc đang sử dụng của BlogNaver vào ngày 28/10/2026, không phải một hướng dẫn khởi tạo blog hoàn toàn mới.

## 1. Blowfish Tools làm được gì?

Theo tài liệu dự án, Blowfish Tools hỗ trợ khởi tạo website, cấu hình theme qua chế độ tương tác, quản lý metadata, tác giả, menu, homepage, header, footer, bố cục trang bài viết, tạo section/bài viết trống, chạy server và tạo trang tĩnh.

Các lệnh chính:

| Lệnh | Mục đích | Có nên dùng trên BlogNaver? |
|---|---|---|
| `npx blowfish-tools` | Khởi động menu tương tác | Có, sau khi backup và tạo nhánh |
| `blowfish-tools config` | Chỉnh cấu hình Blowfish | Có, cần review diff |
| `blowfish-tools run` | Chạy server thử nghiệm | Có thể dùng; nếu không tương thích, dùng `hugo server` |
| `blowfish-tools generate` | Tạo bản build tĩnh | Có thể dùng; lệnh build chuẩn là `hugo --minify` |
| `blowfish-tools new <folder>` | Khởi tạo project mới | **Không** chạy trong repository hiện tại |
| `blowfish-tools install` | Cài theme vào project | **Không** cần, vì BlogNaver đã có Blowfish |
| `blowfish-tools update` | Cập nhật theme kiểu submodule | **Không khuyến nghị** cho dự án đang dùng Hugo Modules |

Tham khảo trực tiếp: [GitHub — blowfish-tools](https://github.com/nunocoracao/blowfish-tools).

## 2. Kiến trúc thực tế của BlogNaver

Website hiện triển khai tại [duynguyenaver.github.io/blognaver](https://duynguyenaver.github.io/blognaver/), với mã nguồn tại [duynguyenaver/blognaver](https://github.com/duynguyenaver/blognaver).

Sơ đồ luồng làm việc:

```text
Blowfish Tools (đề xuất / thử config)
             |
             v
config/_default/*.toml + assets/css
             |
             v
Hugo Extended + Hugo Modules
             |
             v
Xem trước / kiểm thử local
             |
             v
Git commit + push main
             |
             v
GitHub Actions build & deploy
             |
             v
GitHub Pages /blognaver/
```

Theme được khai báo bằng Hugo Module:

```toml
# config/_default/module.toml
[[imports]]
  path = "github.com/nunocoracao/blowfish/v3"
```

Điều này khác với hướng dẫn cài Blowfish vào thư mục `themes/blowfish` bằng Git submodule. **Không trộn hai phương pháp cài đặt** trong cùng một dự án.

Các file bạn cần nhận diện:

| File / thư mục | Chức năng |
|---|---|
| `config/_default/params.toml` | Homepage, article, header, footer, search |
| `config/_default/languages.vi.toml` | Tên blog, tagline, author |
| `config/_default/menus.vi.toml` | Điều hướng |
| `assets/css/schemes/blognaver-blue.css` | Bảng màu xanh navy riêng |
| `assets/css/custom.css` | Điều chỉnh typography, spacing, component |
| `content/posts/` | Bài viết Markdown |
| `layouts/` | Layout tùy chỉnh, bao gồm Resume |
| `static/resume-cms/` | CMS quản lý Resume |
| `.github/workflows/hugo.yml` | GitHub Actions deploy |
| `BRANDING.md` | Quy chuẩn UI/UX |
| `DEPLOYMENT.md` | Quy trình triển khai |

## 3. Chuẩn bị trên máy cá nhân

Bạn cần **Git, Go, Node.js/npm và Hugo Extended**. Hugo 0.162.0 trở lên là mức tối thiểu hiện được tài liệu Blowfish yêu cầu, nhưng nên dùng phiên bản tương thích với repository và workflow đang chạy.

### macOS

Nếu đã cài Homebrew:

```bash
brew install git go node hugo
```

Kiểm tra:

```bash
git --version
go version
node --version
npm --version
hugo version
```

Đầu ra `hugo version` nên thể hiện bản **extended**.

### Windows

Có thể cài các công cụ bằng winget hoặc trình cài đặt chính thức. Ví dụ, trong PowerShell:

```powershell
winget install Git.Git
winget install GoLang.Go
winget install OpenJS.NodeJS.LTS
winget install Hugo.Hugo.Extended
```

Khởi động lại Terminal sau khi cài và chạy lại các lệnh kiểm tra phiên bản. Nếu một package ID không còn tồn tại, dùng `winget search hugo` để xác nhận trước khi cài.

## 4. Tải mã nguồn BlogNaver và tạo nhánh thử nghiệm

Trên Terminal:

```bash
git clone https://github.com/duynguyenaver/blognaver.git
cd blognaver

git status
git switch -c experiment/blowfish-tools
```

Tạo nhánh riêng giúp bạn kiểm tra thay đổi trước khi đưa vào `main`. Nếu đang có thay đổi chưa commit, hãy commit hoặc stash chúng trước.

Tải các phụ thuộc Hugo Module:

```bash
hugo mod download
hugo server -D
```

Mở địa chỉ local Hugo hiển thị trong Terminal, thường là `http://localhost:1313/blognaver/` hoặc một đường dẫn do server thông báo. Không tự giả định cổng hay base path khi server trả về giá trị khác.

## 5. Mở Blowfish Tools

Cách nhanh nhất là sử dụng `npx`, không cần cài global:

```bash
npx blowfish-tools
```

Để xem các lệnh:

```bash
npx blowfish-tools --help
```

Nếu muốn cài toàn cục:

```bash
npm install -g blowfish-tools
blowfish-tools
```

Khi chạy trong thư mục BlogNaver, chọn tính năng cấu hình project hiện có nếu CLI hỗ trợ và phát hiện được cấu trúc Hugo Module. Có thể thử:

```bash
npx blowfish-tools config
```

**Quan trọng:** Không phải mọi đường dẫn và kiểu cài theme đều chắc chắn được xử lý giống nhau bởi CLI. Nếu công cụ không nhận ra Hugo Modules hoặc đề nghị khởi tạo/cài lại toàn bộ theme, hãy thoát mà không ghi đè file rồi chỉnh TOML bằng tay theo tài liệu Blowfish.

## 6. Thử chỉnh giao diện mà không đánh mất branding

Ví dụ, bạn muốn đổi cách hiển thị trang chủ hoặc bật một tùy chọn header.

Trong giao diện CLI, tìm nhóm **Homepage**, **Header**, **Article pages** hoặc **Footer**. Chỉ thay đổi một nhóm mỗi lần, sau đó lưu cấu hình và xem các file vừa bị sửa.

```bash
git diff -- config/_default/
git diff -- assets/
```

Với BlogNaver, thiết kế đã được chuẩn hóa tại [Branding Guidelines](https://duynguyenaver.github.io/blognaver/branding/). Các token quan trọng:

| Token | Mã màu |
|---|---|
| Nền chính | `#10172F` |
| Card / panel | `#1C2747` |
| Xanh chủ đạo | `#397BE0` |
| Link / focus | `#70B6F8` |
| Chữ chính | `#EDF3FF` |
| Chữ phụ | `#A9B8D7` |

**Không đổi `colorScheme` về `neon` hoặc palette tím/hồng.** Tên scheme chính thức là `blognaver-blue`. Các thiết lập của theme do CLI sinh ra phải được đối chiếu với `BRANDING.md` trước khi commit.

Lưu ý riêng: những trang tùy chỉnh như Resume và Resume CMS có thể có CSS/layout độc lập; thay đổi một tham số Blowfish không tự động làm chúng đổi theo.

## 7. Chạy thử và kiểm tra trước khi push

Chạy server:

```bash
hugo server -D
```

Sau đó build production:

```bash
hugo --gc --minify \
  --baseURL "https://duynguyenaver.github.io/blognaver/"
```

Trên PowerShell, dùng một dòng thay cho ký tự nối dòng `\`:

```powershell
hugo --gc --minify --baseURL "https://duynguyenaver.github.io/blognaver/"
```

Kiểm tra lần lượt trang chủ, bài viết, menu, tìm kiếm, trang Resume, Resume CMS và trang Branding; xem trên cả mobile và desktop. Với thay đổi giao diện, thử dark/light, keyboard focus, các trường form và chức năng in PDF.

Nếu thấy file cấu hình ngoài dự kiến thay đổi, xem kỹ bằng `git diff`. Có thể hoàn nguyên **một file đã chọn** bằng:

```bash
git restore -- config/_default/params.toml
```

Lệnh này làm mất các thay đổi **chưa commit trong file đó**, nên chỉ chạy sau khi đã xem diff và xác nhận không cần giữ chúng.

## 8. Đưa thay đổi lên GitHub và deploy

Sau khi kiểm thử, commit trên nhánh thử nghiệm:

```bash
git add config/_default assets
git commit -m "style: refine Blowfish configuration"
git push -u origin experiment/blowfish-tools
```

Tạo Pull Request từ nhánh thử nghiệm vào `main`. Kiểm tra khác biệt, sau đó merge khi đã đạt yêu cầu.

GitHub Actions của BlogNaver sẽ build Hugo và triển khai lên GitHub Pages khi có push tới `main`. Theo quy trình đã được thiết lập tại [DEPLOYMENT.md](https://github.com/duynguyenaver/blognaver/blob/main/DEPLOYMENT.md), các workflow được xếp hàng thay vì chủ động hủy lần đang chạy. Tuy nhiên, vẫn phải kiểm tra trạng thái thực tế tại [GitHub Actions](https://github.com/duynguyenaver/blognaver/actions).

**Blowfish Tools không cần chạy trên GitHub Actions** chỉ để deploy. CI hiện dùng Hugo trực tiếp, đơn giản và dễ chẩn đoán hơn.

## 9. Cập nhật Blowfish lên phiên bản mới

Đây là bước khác với việc chỉnh config.

Do BlogNaver dùng Hugo Modules, quy trình cập nhật là:

```bash
git switch -c maintenance/update-blowfish
hugo mod get -u
hugo mod tidy
hugo server
hugo --gc --minify
git diff
```

Xem thay đổi của các file module như `go.mod` và `go.sum`. Kiểm tra trang chủ, bài viết, Resume CMS và các layout tùy chỉnh rồi mới commit.

**Không chạy `blowfish-tools update` như phương pháp cập nhật mặc định cho BlogNaver**, vì mô tả CLI hiện tại áp dụng cho theme cài bằng Git submodule. Tài liệu nâng cấp Blowfish 3 cũng chỉ dẫn Hugo Module users dùng `hugo mod get -u`.

Nguồn: [Hướng dẫn nâng cấp Blowfish 3](https://blowfish.page/guides/202608-upgrade-to-blowfish-v3/).

## 10. Những lỗi phổ biến cần tránh

**Lỗi 1 — chạy `new` trong repo hiện tại:** Có thể sinh cấu trúc project mới, gây xung đột cấu hình hoặc làm rối file hiện có. Chỉ dùng `new` trong thư mục thử nghiệm hoàn toàn riêng.

**Lỗi 2 — chạy `install` dù theme đã tồn tại:** Dễ khiến cấu trúc Hugo Module và Git submodule bị trộn lẫn. BlogNaver không cần cài Blowfish lại.

**Lỗi 3 — đổi bảng màu về Neon:** Sẽ tái xuất hiện màu tím/hồng từng không phù hợp với reference N9O. Cần giữ `blognaver-blue`.

**Lỗi 4 — build thành công nhưng URL chưa đổi:** Build local không phải deploy. Kiểm tra workflow GitHub Pages và commit SHA tương ứng.

**Lỗi 5 — ghi đè file layout/CMS:** CLI không hiểu hết yêu cầu riêng của project. Luôn kiểm tra `git diff` và tránh chỉnh logic xuất bản resume nếu công việc chỉ liên quan theme.

**Lỗi 6 — đặt GitHub token trong code:** Không thêm PAT vào repository, Markdown, workflow hay cấu hình công khai. Dùng xác thực Git của máy hoặc GitHub CLI khi cần.

## 11. Quy trình đề xuất cho BlogNaver về lâu dài

| Tác vụ | Công cụ chính |
|---|---|
| Thử bố cục / tùy chỉnh theme | Blowfish Tools |
| Chỉnh sâu thiết kế và màu sắc | Hugo TOML + custom CSS |
| Thêm bài viết | Markdown hoặc CMS |
| Nâng cấp theme Hugo Module | `hugo mod get -u` |
| Xem trước | `hugo server -D` |
| Kiểm thử bản build | `hugo --gc --minify` |
| Quản lý thay đổi | Git + Pull Request |
| Deploy production | GitHub Actions + GitHub Pages |
| Chuẩn nhận diện | `BRANDING.md` + `AGENTS.md` |

**Kết luận:** Blowfish Tools đáng sử dụng như một giao diện cấu hình giúp thử nghiệm và học các tính năng của Blowfish. Nhưng nó hiệu quả nhất khi kết hợp với Hugo Modules, kiểm thử tại máy và một quy trình Git/CI rõ ràng. Với BlogNaver đã có branding, layout tùy chỉnh và CMS, nguyên tắc quan trọng nhất là **thử trước, xem diff, kiểm tra kỹ, rồi mới merge và deploy**.

### Tài liệu tham khảo

- [Blowfish Tools — GitHub](https://github.com/nunocoracao/blowfish-tools)
- [Blowfish — Installation](https://blowfish.page/docs/installation/)
- [Nâng cấp theme lên Blowfish 3](https://blowfish.page/guides/202608-upgrade-to-blowfish-v3/)
- [BlogNaver — Branding Guidelines](https://duynguyenaver.github.io/blognaver/branding/)
- [BlogNaver — Deployment Policy](https://github.com/duynguyenaver/blognaver/blob/main/DEPLOYMENT.md)
