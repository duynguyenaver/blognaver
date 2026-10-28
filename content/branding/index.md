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
