---
title: "Fix Bug 2026: Expected route missing — PR #278"
date: "2026-11-01T09:54:25.000Z"
draft: false
slug: "fixbug-2026-pr-278"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #278"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 278
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #278](https://github.com/duynguyenaver/blognaver/pull/278) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** feat: import BlogNaver article URLs into all TTS sections.

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** Expected route missing.

**Hướng kiểm tra:** Inspect page front matter, drafts, menu links, permalink config and published public directory.

Chi tiết được lấy từ [CI run thất bại #41290642532](https://github.com/duynguyenaver/blognaver/actions/runs/41290642532). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- .github/workflows/pr-bug-checker.yml (modified, +2/-0)
- scripts/test-tts-url-import.mjs (added, +153/-0)
- static/tien-ich/text-to-speech/article-url-import.js (added, +225/-0)
- static/tien-ich/text-to-speech/index.html (modified, +29/-1)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/278/files) để đối chiếu.

## Các commit để đối chiếu

- [d8176eca84](https://github.com/duynguyenaver/blognaver/commit/d8176eca84973b5b87a5e995296965122d57507e): feat(tts): import same-origin BlogNaver article URL into voiceover pipeline
- [f479d86c83](https://github.com/duynguyenaver/blognaver/commit/f479d86c83360284d9dcd9848cf3afce420aa94c): feat(tts): add URL import form and connect BlogNaver extraction pipeline
- [81431d0eeb](https://github.com/duynguyenaver/blognaver/commit/81431d0eeb2e486c5383fd388a018eec1a966fc9): test(tts): expose URL importer for browser-flow regression coverage
- [1be9d31a55](https://github.com/duynguyenaver/blognaver/commit/1be9d31a55d9fbc2aa7c79eef284240b07c1e0a5): test(tts): cover BlogNaver URL validation, extraction and cross-section auto-fill
- [a3bf42e325](https://github.com/duynguyenaver/blognaver/commit/a3bf42e32522f36f6e1792e6f354d38376541211): test(tts): assert URL errors across isolated VM realms
- [2cd5e2ae8d](https://github.com/duynguyenaver/blognaver/commit/2cd5e2ae8d1ee0dbac0f10581168c97174bcd728): ci(tts): run URL ingestion and speech regression tests on PRs
- [cf75acacc1](https://github.com/duynguyenaver/blognaver/commit/cf75acacc1df70bb6f356c64285d2c3841b19980): ci(tts): gate URL importer with its passing focused tests

## Kết quả kiểm chứng

- CI từng lỗi: [run #41290642532](https://github.com/duynguyenaver/blognaver/actions/runs/41290642532).
- CI chạy thành công sau bản sửa: [run #41290746192](https://github.com/duynguyenaver/blognaver/actions/runs/41290746192).
- Bản thay đổi đã merge: [PR #278](https://github.com/duynguyenaver/blognaver/pull/278).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/278)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
