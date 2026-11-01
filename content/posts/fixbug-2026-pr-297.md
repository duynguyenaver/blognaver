---
title: "Fix Bug 2026: fix: constrain all thumbnail and cover text to Safe Text Area — PR #297"
date: "2026-11-01T10:26:49.000Z"
draft: false
slug: "fixbug-2026-pr-297"
description: "Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #297"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 297
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

[PR #297](https://github.com/duynguyenaver/blognaver/pull/297) ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix: constrain all thumbnail and cover text to Safe Text Area.

**Chế độ bằng chứng:** Engineering postmortem. **Nhóm lỗi:** Documented product defect and code repair.

**Hướng kiểm tra:** Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established..

Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa](https://github.com/duynguyenaver/blognaver/pull/297). Không có log thất bại để xác minh độc lập nguyên nhân.

## Những file có thay đổi trong PR

- scripts/test-thumbnail-safe-text.cjs (added, +51/-0)
- static/tien-ich/youtube-thumbnail-cover-generator/preview-lab.css (modified, +1/-1)
- static/tien-ich/youtube-thumbnail-cover-generator/studio.js (modified, +70/-7)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/297/files) để đối chiếu.

## Các commit để đối chiếu

- [8c3e8a975f](https://github.com/duynguyenaver/blognaver/commit/8c3e8a975f276d01b9cf4c7e22d7f21d939f5db3): fix(thumbnail): keep headline, series and captions inside shared 10% safe text area
- [78aee1b5af](https://github.com/duynguyenaver/blognaver/commit/78aee1b5afc52eee6f7f5a922a6e6f6699241f05): fix(thumbnail): preserve full-width background while clipping typography to safe region
- [25930a75dd](https://github.com/duynguyenaver/blognaver/commit/25930a75dd7d73a3d3621cb2eb2c2505ad88c5e0): fix(thumbnail): keep SAFE TEXT AREA label outside text region in preview
- [6eb5d875d1](https://github.com/duynguyenaver/blognaver/commit/6eb5d875d1628f3ac531a91b0fc94ee42ac6103f): test(thumbnail): prevent typography spilling beyond safe area in cover and thumbnail

## Kết quả kiểm chứng

- Chưa xác minh được CI thất bại trước khi sửa.
- CI chạy thành công sau bản sửa: [run #41297474105](https://github.com/duynguyenaver/blognaver/actions/runs/41297474105).
- Bản thay đổi đã merge: [PR #297](https://github.com/duynguyenaver/blognaver/pull/297).

**Giới hạn:** Root cause do PR mô tả, chưa chứng minh được bằng CI lỗi trước đó. Diff và CI xanh chứng minh có thay đổi mã và kiểm thử qua, không chứng minh lỗi đã tái hiện/khắc phục trên production.

## Bài học có thể tái sử dụng

1. Lưu và kiểm tra log thất bại trước khi sửa.
2. Phân loại deterministic và transient; không coi retry là repair.
3. So sánh diff giữa các revision và kiểm tra lỗi bằng lệnh phù hợp.
4. Chỉ đưa thay đổi lên main sau khi CI hiện hành thành công.
5. Kiểm tra GitHub Pages và UI sau deploy, không tuyên bố hoàn thành chỉ từ CI xanh.

## Nguồn tham khảo

- [Knowledge Base của BlogNaver](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json)
- [PR Bug Checker](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/pr-bug-checker.yml)
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/297)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
