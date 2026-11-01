---
title: "Fix Bug 2026: Expected route missing — PR #290"
date: "2026-11-01T09:31:50.000Z"
draft: false
slug: "fixbug-2026-pr-290"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #290"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 290
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #290](https://github.com/duynguyenaver/blognaver/pull/290) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** feat(tts): choose pronunciation rules to sync and listen per word in Section 04.

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** Expected route missing.

**Hướng kiểm tra:** Inspect page front matter, drafts, menu links, permalink config and published public directory.

Chi tiết được lấy từ [CI run thất bại #41293442782](https://github.com/duynguyenaver/blognaver/actions/runs/41293442782). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- scripts/test-tts-pronunciation-training.mjs (modified, +109/-4)
- static/tien-ich/text-to-speech/index.html (modified, +17/-5)
- static/tien-ich/text-to-speech/pronunciation-training.js (modified, +145/-20)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/290/files) để đối chiếu.

## Các commit để đối chiếu

- [cd4ed0fa5c](https://github.com/duynguyenaver/blognaver/commit/cd4ed0fa5cd2a58ba6354c22cf16a734f540f75b): feat(tts): selectively sync checked pronunciation changes and preview each word in Section 04
- [a0994c15dc](https://github.com/duynguyenaver/blognaver/commit/a0994c15dc032c2aab2a50d6e1e64109adf55631): ui(tts): checkbox sync selection and inline audio preview per correction in Section 04
- [6b25accbac](https://github.com/duynguyenaver/blognaver/commit/6b25accbac21cad6a20c36ce110d2bf8a104b197): test(tts): verify selective per-word PR updates, skip unchanged rules, and inline spoken previews
- [a115ba130e](https://github.com/duynguyenaver/blognaver/commit/a115ba130e84db8a14e1cf397cfc061e6bdd12cc): fix(tts): use correct DOM IDs for audio controls and render staged pronunciation immediately
- [eecf8c7de9](https://github.com/duynguyenaver/blognaver/commit/eecf8c7de9db66bfcb1e023f957aa72a733e4c76): test(tts): compare VM-returned pending keys without cross-realm prototype mismatch

## Kết quả kiểm chứng

- CI từng lỗi: [run #41293442782](https://github.com/duynguyenaver/blognaver/actions/runs/41293442782).
- CI chạy thành công sau bản sửa: [run #41293475961](https://github.com/duynguyenaver/blognaver/actions/runs/41293475961).
- Bản thay đổi đã merge: [PR #290](https://github.com/duynguyenaver/blognaver/pull/290).

**Giới hạn:** Hai lượt CI ở hai SHA khác nhau cho thấy trạng thái kiểm thử đã đổi sau khi sửa source. CI xanh không thay thế kiểm chứng production.

## Bài học có thể tái sử dụng

1. Lưu và kiểm tra log thất bại trước khi sửa.
2. Phân loại deterministic và transient; không coi retry là repair.
3. So sánh diff giữa các revision và kiểm tra lỗi bằng lệnh phù hợp.
4. Chỉ đưa thay đổi lên main sau khi CI hiện hành thành công.
5. Kiểm tra GitHub Pages và UI sau deploy, không tuyên bố hoàn thành chỉ từ CI xanh.

## Nguồn tham khảo

- [Knowledge Base của BlogNaver](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json)
- [PR Bug Checker](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/pr-bug-checker.yml)
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/290)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
