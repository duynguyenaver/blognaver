---
title: "Fix Bug 2026: fix(tts): asynchronously select Hoai My Natural when online voice loads — PR #249"
date: "2026-10-31T15:07:44.000Z"
draft: false
slug: "fixbug-2026-pr-249"
description: "Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #249"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 249
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

[PR #249](https://github.com/duynguyenaver/blognaver/pull/249) ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix(tts): asynchronously select Hoai My Natural when online voice loads.

**Chế độ bằng chứng:** Engineering postmortem. **Nhóm lỗi:** Documented product defect and code repair.

**Hướng kiểm tra:** Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established..

Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa](https://github.com/duynguyenaver/blognaver/pull/249). Không có log thất bại để xác minh độc lập nguyên nhân.

## Những file có thay đổi trong PR

- static/tien-ich/text-to-speech/index.html (modified, +48/-10)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/249/files) để đối chiếu.

## Các commit để đối chiếu

- [25c720e4b9](https://github.com/duynguyenaver/blognaver/commit/25c720e4b953fc3cae07c0e1bd8a15aa24b760ec): fix(tts): async voice refresh with Hoai My, online/natural, vi fallback

## Kết quả kiểm chứng

- Chưa xác minh được CI thất bại trước khi sửa.
- CI chạy thành công sau bản sửa: [run #41213304963](https://github.com/duynguyenaver/blognaver/actions/runs/41213304963).
- Bản thay đổi đã merge: [PR #249](https://github.com/duynguyenaver/blognaver/pull/249).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/249)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
