---
title: "Auto Fixer khi Pull Request thất bại: hệ thống BlogNaver thông minh đến đâu?"
date: 2026-10-29T09:12:00+07:00
draft: false
series: ["tech-blog"]
seriesOrder: 2
slug: "tech-blog-autofixer-pr-failed"
description: "Đi sâu vào cơ chế phát hiện, phân loại, retry và tự sửa có giới hạn khi PR GitHub Actions failed trên BlogNaver."
categories: ["Công nghệ", "Tech Blog"]
tags: ["series", "Tech Blog", "BlogNaver", "GitHub Actions", "DevOps", "Auto Fixer"]
author: "Duy Nguyen"
---

*Tech Blog · Kỳ 2/4 · Nghiên cứu dựa trên source BlogNaver tại thời điểm 29/10/2026.*

Có một thông báo GitHub Actions khiến nhiều người tưởng hệ thống “đã thử sửa ba lần”: **Bug Checker failed all 3 attempts; stop here.** Trong thực tế, ba lần này có thể chỉ là ba lượt chạy cùng một bản code. Để hiểu Auto Fixer thông minh đến đâu, phải phân biệt bốn chức năng: **detect**, **classify**, **retry** và **repair**.

## Đường đi của một Pull Request bị Failed

Khi một PR hướng tới `main` được mở hoặc cập nhật, `.github/workflows/pr-bug-checker.yml` chạy. Job chuẩn bị Hugo, Go, cache module và các bài kiểm thử knowledge base. Sau đó script thực hiện build production, sinh chỉ mục bài viết và chạy site audit. Kết quả được lưu thành log `bug-check-1.log`, `bug-check-2.log` hoặc `bug-check-3.log`.

Nếu một lượt không thành công, workflow gọi `scripts/ci-classify-failure.py` với log thật, đối chiếu pattern trong `data/ci/bug-knowledge.json`. Bộ phân loại xuất tên vấn đề, loại lỗi, hướng xử lý và nguồn tài liệu. Đây là **triage dựa trên luật**, chưa phải AI tự tạo patch.

## Ví dụ thật: PR #41 và lỗi Regular Expression

Trong đợt xây workspace “Tất cả bài viết”, PR #41 bị CI từ chối. Log của run [40876960699](https://github.com/duynguyenaver/blognaver/actions/runs/40876960699) có dòng:

`SyntaxError: Invalid regular expression flags`

Bộ phân loại xác định nhóm **JavaScript parse error**, khuyến cáo chạy `node --check` và sửa source. CI vẫn thử lại đến ba lượt; cả ba đều báo lỗi vì nội dung file chưa thay đổi. Sau khi có commit chỉnh sửa JavaScript, PR được kiểm tra lại bằng một run mới. Điều này cho thấy hệ thống đã làm tốt việc **phát hiện và chặn mã hỏng**, nhưng không có bằng chứng cho thấy nó tự đề xuất rồi tự commit một bản vá JS.

## Auto Fixer thực sự đang có những cấp độ nào?

**Cấp 1 — Detection:** Phát hiện lỗi thực tế qua Hugo, Node, kiểm tra file và đầu ra trang.

**Cấp 2 — Classification:** Dùng knowledge base để gắn nhãn như `js-syntax`, lỗi cấu hình template, thiếu output hoặc Git history. Pattern matching có thể sai, nên luôn cần đối chiếu dòng lỗi đầu tiên.

**Cấp 3 — Retry:** Workflow cho phép tối đa ba lượt. Retry hữu ích khi network/module download thất thường; gần như vô dụng với lỗi deterministic như JavaScript sai cú pháp.

**Cấp 4 — Bounded Repair:** Repository có workflow `.github/workflows/safe-conflict-fixer.yml` chủ động sửa **một trường hợp conflict đã được cho phép từ trước**: rollback sang Blowfish làm file footer Stack cũ bị modify/delete, trong khi phần dashboard mới phải được giữ ở vị trí thích hợp. Script kiểm tra pattern và từ chối nếu phát hiện thêm conflict. Đây là tự sửa giới hạn theo quy tắc, không phải tác nhân sửa tất cả PR.

Trong cấu hình hiện tại, BlogNaver **không có Auto Fixer tổng quát dùng AI để tự viết lại mọi file bị failed**. Gắn nhãn “AI self-healing” cho toàn bộ pipeline vì thế sẽ gây hiểu nhầm.

## Vì sao không nên tự sửa mọi lỗi ngay lập tức?

Một log lỗi không luôn chỉ ra giải pháp duy nhất. Ví dụ, một trang biến mất có thể vì front matter `date`, `draft`, permalink hoặc lỗi template. Tự xóa phần code gây lỗi để build xanh sẽ có nguy cơ làm mất tính năng. Với dữ liệu CMS hoặc workflow có quyền ghi `main`, rủi ro còn lớn hơn: hệ thống có thể làm lộ dữ liệu, thay đổi file quan trọng hoặc tạo vòng lặp CI.

Bản sửa tự động hợp lý cần có phạm vi cho phép rõ ràng, kiểm tra điều kiện đầu vào, chỉ chỉnh file được chỉ định, tạo commit trên **nhánh PR**, so sánh diff và chạy lại toàn bộ CI. Khi không chắc chắn, hệ thống phải dừng và công bố lý do, thay vì cố tạo ra một “fix” có vẻ thành công.

## Thiết kế Auto Fixer thế hệ tiếp theo

Một kiến trúc có thể mở rộng từ BlogNaver gồm: (1) nhận artifact/log của run failed; (2) phân nhóm deterministic/transient; (3) tra knowledge base và mẫu sửa đã kiểm thử; (4) chỉ áp dụng patch khi pattern khớp chính xác; (5) chạy `node --check` hoặc Hugo build cục bộ trên nhánh PR; (6) commit và chờ CI độc lập kiểm lại; (7) dừng khi vượt ngân sách thử hoặc có thay đổi ngoài phạm vi.

Nếu sau này tích hợp LLM, mô hình nên chỉ **đề xuất diff** trong sandbox quyền thấp, không được tự nhận secret hay bỏ qua checks. Khả năng giải thích và khả năng từ chối mới tạo nên “sự thông minh” đáng tin cậy.

## Kết luận

Auto Fixer mạnh không phải hệ thống sửa bằng mọi giá, mà là hệ thống **biết lỗi nào có thể tự sửa và lỗi nào phải dừng**. Kỳ 3 tìm hiểu nơi kiến thức đó được hình thành: `AGENTS.md` và machine-readable Knowledge Base.

## Đọc tiếp series Tech Blog

- [Kỳ 1: Deployment Culture: Vì sao deploy thành công chưa có nghĩa website đã đúng?](/blognaver/bai-viet/tech-blog-deployment-culture/)
- [Kỳ 2: Auto Fixer khi Pull Request thất bại: hệ thống BlogNaver thông minh đến đâu?](/blognaver/bai-viet/tech-blog-autofixer-pr-failed/)
- [Kỳ 3: Knowledge Base và AGENTS.md: Biến lịch sử lỗi thành kinh nghiệm kiểm thử có thể tái sử dụng](/blognaver/bai-viet/tech-blog-knowledge-base-agents-md/)
- [Kỳ 4: Auto Merge trên GitHub: Cơ chế kiểm tra SHA, CI xanh và deploy sau merge của BlogNaver](/blognaver/bai-viet/tech-blog-github-automerge/)

---

### Nguồn và giới hạn kiểm chứng

- [GitHub Docs — Triggering workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub Docs — Pull Requests REST API](https://docs.github.com/en/rest/pulls/pulls)
- [BlogNaver — PR Bug Checker](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/pr-bug-checker.yml)
- [BlogNaver — Auto Approve & Merge](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/auto-approve.yml)
- [BlogNaver — AGENTS.md](https://github.com/duynguyenaver/blognaver/blob/main/AGENTS.md)
- [BlogNaver — Bug Knowledge Base](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json)

*Thông tin về chức năng hiện hành được kiểm chứng từ source repository. Những đề xuất cải tiến được trình bày như thiết kế tương lai, không phải tính năng đã triển khai. Quy trình và workflow có thể thay đổi sau khi bài đăng.*
