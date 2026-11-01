---
title: "Fix Bug 2026: Expected route missing — PR #282"
date: "2026-11-01T09:09:11.000Z"
draft: false
slug: "fixbug-2026-pr-282"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #282"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 282
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #282](https://github.com/duynguyenaver/blognaver/pull/282) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** feat: Section 04 train Vietnamese and English TTS pronunciation via GitHub PR dictionary.

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** Expected route missing.

**Hướng kiểm tra:** Inspect page front matter, drafts, menu links, permalink config and published public directory.

Chi tiết được lấy từ [CI run thất bại #41291740662](https://github.com/duynguyenaver/blognaver/actions/runs/41291740662). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- .github/workflows/pr-bug-checker.yml (modified, +2/-0)
- scripts/test-tts-gen-g-pronunciation.mjs (modified, +1/-1)
- scripts/test-tts-pronunciation-training.mjs (added, +142/-0)
- static/tien-ich/text-to-speech/index.html (modified, +66/-1)
- static/tien-ich/text-to-speech/pronunciation-dictionary.json (added, +12/-0)
- static/tien-ich/text-to-speech/pronunciation-training.js (added, +298/-0)
- static/tien-ich/text-to-speech/voice-fixer.js (modified, +2/-1)
- static/tien-ich/text-to-speech/voiceover-preprocess.js (modified, +1/-1)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/282/files) để đối chiếu.

## Các commit để đối chiếu

- [cd45cca9fb](https://github.com/duynguyenaver/blognaver/commit/cd45cca9fbdf9c5e529dd9b4ee470b2615e83426): feat(tts): prioritize owner pronunciation rules in Voice Fixer
- [d5fa1d6e88](https://github.com/duynguyenaver/blognaver/commit/d5fa1d6e88f63fde134e5192af44ed4b3e0a880b): feat(tts): prioritize owner pronunciation rules during Section 02 preprocessing
- [5a45b78468](https://github.com/duynguyenaver/blognaver/commit/5a45b784684520dc02a07db531b145fe09b9d3fc): fix(tts): distinguish submitted PR corrections from deployed GitHub dictionary
- [30a0cab683](https://github.com/duynguyenaver/blognaver/commit/30a0cab6830585eb5bdfcfec7901a0a43115daf7): fix(tts): exclude URLs, emails and code from learned phonetic replacements
- [654f07b922](https://github.com/duynguyenaver/blognaver/commit/654f07b922d23acf1b4dbd0e4e0878215d9df653): test(tts): validate pronunciation learning, safe matching and GitHub PR-only saving
- [eba2f2577e](https://github.com/duynguyenaver/blognaver/commit/eba2f2577eb7dd12d103f68b7103f75dd7615246): ci(tts): gate pronunciation learning and PR-only GitHub saving
- [c65da24ed9](https://github.com/duynguyenaver/blognaver/commit/c65da24ed99e0dbb5a9be1cabbc6acf917d34ab5): test(tts): accept new versioned Voice Fixer URL with training Section 04
- [07c617e50f](https://github.com/duynguyenaver/blognaver/commit/07c617e50fa21498c7a6d28ba4738ba8f2dfaf4e): test(tts): load seeded Gen.G rule before testing trained standalone G

## Kết quả kiểm chứng

- CI từng lỗi: [run #41291740662](https://github.com/duynguyenaver/blognaver/actions/runs/41291740662).
- CI chạy thành công sau bản sửa: [run #41291799356](https://github.com/duynguyenaver/blognaver/actions/runs/41291799356).
- Bản thay đổi đã merge: [PR #282](https://github.com/duynguyenaver/blognaver/pull/282).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/282)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
