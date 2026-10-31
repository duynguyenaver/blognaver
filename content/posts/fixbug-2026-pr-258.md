---
title: "Fix Bug 2026: hotfix(tts): purge publication dates, UI buttons and reading metadata before voiceover — PR #258"
date: "2026-10-31T16:12:36.000Z"
draft: false
slug: "fixbug-2026-pr-258"
description: "Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #258"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 258
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

[PR #258](https://github.com/duynguyenaver/blognaver/pull/258) ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.

## Bối cảnh và dấu hiệu lỗi

**PR:** hotfix(tts): purge publication dates, UI buttons and reading metadata before voiceover.

**Chế độ bằng chứng:** Engineering postmortem. **Nhóm lỗi:** Documented product defect and code repair.

**Hướng kiểm tra:** Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established..

Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa](https://github.com/duynguyenaver/blognaver/pull/258). Không có log thất bại để xác minh độc lập nguyên nhân.

## Những file có thay đổi trong PR

- AGENTS.md (modified, +1/-1)
- scripts/test-voiceover-preprocess.mjs (modified, +40/-2)
- static/tien-ich/text-to-speech/index.html (modified, +2/-2)
- static/tien-ich/text-to-speech/voiceover-preprocess.js (modified, +85/-8)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/258/files) để đối chiếu.

## Các commit để đối chiếu

- [e0eba428dc](https://github.com/duynguyenaver/blognaver/commit/e0eba428dcd865095d4ae11d9a10404b22847a99): hotfix(tts): strip UI buttons, calendar dates and publication stats before voiceover conversion
- [27efb84d8d](https://github.com/duynguyenaver/blognaver/commit/27efb84d8db01926fb609d3efc64fdf349d18ba2): fix(tts): clean dangling date prepositions, ISO dates and read-time fragments
- [f6fd0f6b75](https://github.com/duynguyenaver/blognaver/commit/f6fd0f6b75490cddd700869b8fec49876d2a0086): fix(tts): eliminate dangling punctuation and standalone metadata labels after date removal
- [7d66ec6cd6](https://github.com/duynguyenaver/blognaver/commit/7d66ec6cd601e04bc6bbfa06173db9814be3ddbe): test(tts): regression coverage for date purging, UI metadata, phonetics and body preservation
- [77caae620e](https://github.com/duynguyenaver/blognaver/commit/77caae620ea83a7173924cf70935f75e1f9eb353): docs(agents): formalize date-free TTS voiceover policy and retain meaningful quantities
- [968933e2ed](https://github.com/duynguyenaver/blognaver/commit/968933e2ed57411f00d8ddc3c91ba1ba2b51bf48): fix(tts): restore Vietnamese sentence capitalization after removing inline dates
- [6e7d0d475d](https://github.com/duynguyenaver/blognaver/commit/6e7d0d475d1ad17ddc3f1adcd78bf3ec995e6f83): fix(tts): explain date-free narration and bust stale preprocessor JS cache

## Kết quả kiểm chứng

- Chưa xác minh được CI thất bại trước khi sửa.
- CI chạy thành công sau bản sửa: [run #41218508065](https://github.com/duynguyenaver/blognaver/actions/runs/41218508065).
- Bản thay đổi đã merge: [PR #258](https://github.com/duynguyenaver/blognaver/pull/258).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/258)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
