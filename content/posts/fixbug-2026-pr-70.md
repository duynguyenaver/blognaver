---
title: "Fix Bug 2026: Hugo template or partial missing — PR #70"
date: "2026-10-29T16:28:12.000Z"
draft: false
slug: "fixbug-2026-pr-70"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #70"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 70
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, CI logs và Knowledge Base, không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #70](https://github.com/duynguyenaver/blognaver/pull/70) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge. Bài ghi lại những tín hiệu có thể kiểm chứng, không khẳng định đã chứng minh được một dòng mã gây lỗi cụ thể.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix(gemini): restore API key validation and model list after quota cooldown.

**Nhóm lỗi nhận diện bằng quy tắc:** Hugo template or partial missing.

**Hướng kiểm tra từ Knowledge Base:** Inspect first nested template error, check layouts override precedence and version compatibility.

Chi tiết được lấy từ [CI run thất bại #40911310985](https://github.com/duynguyenaver/blognaver/actions/runs/40911310985). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- data/research-studio/insights.json (modified, +1/-1)
- static/tien-ich/tao-series-post/index.html (modified, +1/-1)
- static/tien-ich/tao-series-post/insights.js (modified, +1/-1)
- static/tien-ich/tao-series-post/studio.css (modified, +6/-0)
- static/tien-ich/tao-series-post/studio.js (modified, +59/-7)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/70/files) để đối chiếu.

## Các commit để đối chiếu

- [63d0a2d717](https://github.com/duynguyenaver/blognaver/commit/63d0a2d7177c1e299d26cd1cfffbea2f6a90347e): fix(gemini): isolate model discovery from generation cooldown, paginate models and report errors
- [46c20541ad](https://github.com/duynguyenaver/blognaver/commit/46c20541adfd0a2aaa48307e6e394d5fa565f78f): ux(gemini): show model loading, valid key and error feedback beside connection button
- [8f11049796](https://github.com/duynguyenaver/blognaver/commit/8f110497963c4dc1f6036839c8090fe606029cbe): style(gemini): clear connection status and errors next to model dropdown
- [422261e4bf](https://github.com/duynguyenaver/blognaver/commit/422261e4bf39e8a4260e6278d47072a815590ff8): fix(data): remove literal newline escape after research studio insights JSON
- [112e8c60ab](https://github.com/duynguyenaver/blognaver/commit/112e8c60ab51a1d3d987038aaef4ff63dce3436c): fix(insights): write valid JSON with actual newline instead of literal escape

## Kết quả kiểm chứng

- CI từng lỗi: [run #40911310985](https://github.com/duynguyenaver/blognaver/actions/runs/40911310985).
- CI chạy thành công sau bản sửa: [run #40911736977](https://github.com/duynguyenaver/blognaver/actions/runs/40911736977).
- Bản thay đổi đã merge: [PR #70](https://github.com/duynguyenaver/blognaver/pull/70).

**Giới hạn:** Hai lượt CI ở hai SHA khác nhau cho thấy trạng thái kiểm thử đã đổi sau khi sửa source. Để nói chính xác lỗi được sửa bởi dòng nào, cần đối chiếu failed log với commit diff. CI xanh cũng không thay thế kiểm chứng production trên trình duyệt.

## Bài học có thể tái sử dụng

1. Lưu và kiểm tra log thất bại trước khi sửa.
2. Phân loại deterministic và transient; không coi retry là repair.
3. So sánh diff giữa các revision và kiểm tra lỗi bằng lệnh phù hợp.
4. Chỉ đưa thay đổi lên main sau khi CI hiện hành thành công.
5. Kiểm tra GitHub Pages và UI sau deploy, không tuyên bố hoàn thành chỉ từ CI xanh.

## Nguồn tham khảo

- [Knowledge Base của BlogNaver](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json)
- [PR Bug Checker](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/pr-bug-checker.yml)
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/70)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
