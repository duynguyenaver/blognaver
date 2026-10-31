---
title: "Branding & UI/UX Guidelines"
description: "Nguồn tham chiếu thiết kế chính thức cho toàn bộ BlogNaver."
date: 2026-10-28
showDate: false
showReadingTime: false
showTableOfContents: true
---

> **BlogNaver Design System — v1.0 · 28/10/2026.** Đây là tài liệu chuẩn cho những lần phát triển giao diện mới. Lấy cảm hứng từ ngôn ngữ thiết kế của [N9O](https://n9o.xyz/) và Blowfish, nhưng giữ thương hiệu, nội dung và tài sản riêng của BlogNaver.

## 1. Brand foundations

**Tên thương hiệu:** BlogNaver  
**Tagline:** Technology · Travel · Stories  
**Tinh thần:** tinh gọn, hiện đại, đậm chất editorial, tập trung nội dung, thân thiện, nhất quán.  
**Thiết kế mặc định:** Dark-first, navy and royal-blue accents, typography dễ đọc, tương phản tốt.

Không sao chép logo, hình ảnh, nhận dạng cá nhân hoặc nội dung của N9O. Mục tiêu là tham chiếu bố cục và nguyên tắc UI, không phải giả mạo thương hiệu gốc.

## 2. Color palette — nguồn chuẩn

**Bản hiệu chỉnh:** Từ 28/10/2026 không dùng palette tím/hồng `neon`. Màu chủ đạo mới là **navy / royal blue / cyan** như screenshot tham chiếu. Đây là quy chuẩn thay thế mọi bảng màu cũ.

{{< brand-swatches >}}

**Supporting tokens:** border `rgba(150,177,223,.22)`; translucent surface `#1C2747`.

Đây là **màu thương hiệu đã chọn cho BlogNaver**, không phải tuyên bố rằng các mã HEX trùng chính xác N9O. Không sử dụng màu tùy tiện nếu đã có semantic token tương đương. Light mode phải duy trì tương phản tốt và không đảo màu ảnh/logo một cách máy móc.

## 3. Typography

- Font stack: `Inter, "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif`. Ưu tiên hỗ trợ dấu tiếng Việt đầy đủ, trọng lượng chữ chắc và rõ.
- Body: chuẩn 16px, line-height khoảng 1.7–1.85 cho nội dung dài.
- Headings: weight 650–800, letter-spacing nhẹ từ `-.025em` đến `-.045em`; H1 ưu tiên ngắn, đọc rõ trên mobile.
- Text phụ dùng Muted Text; không dùng chữ nhạt trên nền nhạt. Links có nhận diện riêng và underline khi phù hợp.

## 4. Layout & spacing

- Header dạng **fixed**, điều hướng gọn: Giới thiệu / Bài viết / Dự án / Resume / Search.
- Trang chủ sử dụng Blowfish **background layout**, ảnh nền/hero riêng và profile/introduction nổi bật.
- Trang chủ hiển thị tối đa **12 bài gần đây**, có card và liên kết đến danh sách đầy đủ.
- Bài viết: max reading width khoảng **76ch**; heading rõ cấp bậc; mục lục, breadcrumb, thời gian đọc, bài liên quan.
- Card: bo góc vừa phải, nền sâu, border mỏng, shadow nhẹ; tránh glassmorphism dày đặc.
- Responsive: layout mobile một cột, menu dễ chạm, không tràn ngang; kích thước vùng chạm mục tiêu ≥44px.
- Khoảng cách dùng hệ 4/8px: 8, 12, 16, 24, 32, 48, 64. Ưu tiên khoảng trắng hơn viền và hiệu ứng trang trí.

## 5. Component rules

| Thành phần | Quy tắc |
|---|---|
| Buttons | Nổi bật bằng Blue/Cyan, thể hiện hover/focus/disabled rõ |
| Links | Có underline hoặc tín hiệu tương tác không chỉ phụ thuộc vào màu |
| Cards | Nội dung dẫn dắt, metadata ngắn, khoảng cách cân đối |
| Forms / CMS | Label luôn hiển thị, validation gần trường nhập, trạng thái lưu và lỗi tường minh |
| Tables | Có header, căn lề rõ, mobile có phương án cuộn hoặc xếp gọn |
| Images | Tỷ lệ nhất quán, mô tả alt, tối ưu dung lượng; không dùng ảnh bên thứ ba nếu không có quyền |
| Alerts | Thông báo thành công/lỗi bằng văn bản, không chỉ qua màu |
| Dark/light | Dark là mặc định; có chuyển giao diện và tôn trọng lựa chọn người dùng |

## 6. UX & accessibility

1. Trình bày theo thứ tự rõ: **mục tiêu → nội dung → hành động**.
2. Ưu tiên WCAG AA: contrast text thông thường tối thiểu 4.5:1, nội dung lớn 3:1; focus visible; keyboard navigation.
3. Tôn trọng `prefers-reduced-motion`; hiệu ứng không cản việc đọc hoặc dùng CMS.
4. Trên mobile: không scroll ngang toàn trang, không popup che biểu mẫu, giữ hành động chính dễ tìm.
5. Không lưu API token hoặc dữ liệu riêng tư vào HTML công khai; không ghi secrets vào git.
6. Không sửa logic nghiệp vụ, dữ liệu hay URL chỉ vì yêu cầu làm đẹp. Mọi thay đổi phá vỡ phải có lý do và kiểm thử.
7. Tránh layout shift, ưu tiên kích thước ảnh xác định, tải nhanh và SEO thân thiện.

## 7. Page-specific guidance

**Homepage:** hero/author profile → featured/most recent articles → browse-more link → footer tối giản.  
**Posts:** ưu tiên trải nghiệm đọc; không để overlay hoặc trang trí lấn át nội dung.  
**Resume:** giữ bố cục profile → Experience → Education → Skills, bảng rõ nét, nút print/PDF; đưa Resume CSS dần về semantic tokens mà không phá xuất PDF.  
**Resume CMS:** cần trạng thái lưu, validation, edit, thông báo URL; không được lộ GitHub PAT.  
**Projects:** card nhất quán với bài viết, có mô tả ngắn và đường dẫn.

## 8. Quy trình bắt buộc với các lần chỉnh sửa mới

1. **Đọc trang này và `BRANDING.md` trước khi thiết kế UI/UX.**
2. Dùng token màu, typography, component và spacing đang có; nếu thay đổi palette, cập nhật cả tài liệu và CSS.
3. Thay đổi ít nhất có thể; bảo vệ tính năng đang chạy, đặc biệt CMS, GitHub Sync và Resume.
4. Kiểm thử tối thiểu desktop/mobile, dark/light, keyboard focus và GitHub Actions build.
5. Sau commit, cung cấp danh sách file đổi, đường dẫn kiểm tra, trạng thái deployment và các giới hạn còn lại.
6. Không nói "giống 100%" nếu chưa đối chiếu screenshot cùng viewport và đo visual regression.

## 9. Implementation references

- `assets/css/custom.css`: style refinements đang có.
- `config/_default/params.toml`: theme, homepage, article và navigation behavior.
- `config/_default/languages.vi.toml`: author headline, brand copy.
- `config/_default/menus.vi.toml`: main navigation.
- `BRANDING.md`: bản Markdown nguồn dành cho developer/AI agents.

Tài liệu được cập nhật khi có thay đổi thực sự về thiết kế. Mọi trang mới phải được kiểm tra theo checklist trên trước khi merge.


## Cập nhật giao diện bài viết · 30/10/2026

Blog công khai dùng giao diện sáng và không còn nút Dark Mode/Search trên header. Đây là quy định hiện hành thay thế hướng dẫn chuyển giao diện ở trên. Từ 1200px, toàn bộ bài viết nằm trong cột đọc tối đa 720px; mục lục có cột riêng 260px và khoảng cách 48px. Màn hình hẹp dùng mục lục trong bài, không dùng khung nổi đè lên tiêu đề hoặc thẻ bài viết.


**Logo header:** chấm tròn đỏ đặc `#bc002d`, đường kính 14px, cách chữ “Duy Nguyen” 8px và căn giữa theo chiều dọc. Thay thế huy hiệu DN trên cả desktop/mobile; màu đỏ chỉ là điểm nhấn logo, giao diện tiếp tục dùng xanh chủ đạo.


## Thiết kế editorial đồng bộ · 30/10/2026

Quy chuẩn mới: logo đỏ 12px, header trắng trong mờ sticky; pill bo tròn hoàn toàn với nền `#f1f5f9`, viền `#cbd5e1`, chữ navy `#1e3a8a`; nội dung 18px/1.75 và cột đọc tối đa 720px. Card trắng bo 12px, padding desktop 24px và shadow nhẹ. Trích dẫn có viền đỏ; inline code nền sáng và code block nền slate tối. Ảnh đại diện 16:9; hình minh họa trong nội dung giữ đầy đủ tỷ lệ. TOC desktop giữ cột riêng và khoảng cách 48px; mobile dùng TOC trong bài. Các quy định mới thay thế kích thước logo/pill cũ ở trên. Nguồn style thống nhất: `static/css/blog-editorial.css`.

## Editorial Tech · Các trang tiện ích

Các trang Điểm danh, Sổ từ vựng, Nhật ký và Phỏng vấn dùng thẻ Bento nền trắng, góc 16px, chữ `#334155`, điểm nhấn `#bc002d` và khoảng cách dòng 1.8. Biểu đồ nhật ký dùng năm sắc độ từ `#f1f5f9` đến `#bc002d`.

Thông báo nổi xác nhận việc lưu **trên thiết bị** sau khi thao tác ghi thành công. Trạng thái GitHub được hiển thị riêng; lưu trên máy không có nghĩa dữ liệu đã được tải lên GitHub.

## Resume CMS · Bản nháp và bản in A4

Biểu mẫu CV dùng thẻ bo góc 16px, label gắn với trường nhập và ô mô tả kinh nghiệm nhiều dòng. Nháp văn bản tự lưu trên máy, không chứa token hoặc ảnh upload; trạng thái này độc lập với xuất bản GitHub.

Bản xem trước và CV đã xuất bản dùng chung cấu hình A4 dọc, lề trên/dưới 10mm và trái/phải 12mm. Mô tả công việc chạy toàn chiều ngang, chữ nội dung 11pt / 1.5; bảng dùng 10pt. Tiêu đề hồ sơ vẫn hiện khi in, các nút điều hướng được ẩn.

## CMS V2 · Chiều cao vùng làm việc

CMS V2 trên desktop sử dụng chiều cao màn hình hiện tại. Nội dung soạn thảo và metadata có vùng cuộn riêng; thanh lưu/preview/xuất bản nằm trong vùng làm việc. Màn hình nhỏ và bàn phím điện thoại sử dụng cuộn trang tự nhiên. Ô Markdown ẩn không được tạo khoảng trống phía dưới editor.
