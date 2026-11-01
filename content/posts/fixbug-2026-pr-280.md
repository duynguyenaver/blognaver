---
title: "Fix Bug 2026: Expected route missing — PR #280"
date: "2026-11-01T09:59:41.000Z"
draft: false
slug: "fixbug-2026-pr-280"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #280"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 280
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #280](https://github.com/duynguyenaver/blognaver/pull/280) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix: pronounce Gen.G as den di in BlogNaver TTS.

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** Expected route missing.

**Hướng kiểm tra:** Inspect page front matter, drafts, menu links, permalink config and published public directory.

Chi tiết được lấy từ [CI run thất bại #41291007822](https://github.com/duynguyenaver/blognaver/actions/runs/41291007822). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- .github/workflows/pr-bug-checker.yml (modified, +2/-0)
- scripts/test-tts-gen-g-pronunciation.mjs (added, +62/-0)
- scripts/test-tts-url-import.mjs (modified, +1/-1)
- static/tien-ich/text-to-speech/index.html (modified, +5/-2)
- static/tien-ich/text-to-speech/voice-fixer.js (modified, +6/-0)
- static/tien-ich/text-to-speech/voiceover-preprocess.js (modified, +4/-0)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/280/files) để đối chiếu.

## Các commit để đối chiếu

- [017a0ff151](https://github.com/duynguyenaver/blognaver/commit/017a0ff151bb333396473f63a5a5fb207d58ea36): fix(tts): pronounce Gen.G as den di and English G as di
- [7fee5fc557](https://github.com/duynguyenaver/blognaver/commit/7fee5fc5573c60f019f1b58f10859340f666a866): fix(tts): normalize Gen.G in voiceover preprocessor
- [85d4d0af77](https://github.com/duynguyenaver/blognaver/commit/85d4d0af777091ae41f256eff22f59e7c3c40037): fix(tts): pronounce English brands in direct speech playback
- [50eea355fe](https://github.com/duynguyenaver/blognaver/commit/50eea355fe271e45a85118a6f3b6907c48cbef89): test(tts): guard Gen.G den di phonetics in both sections and direct playback
- [742edb92ca](https://github.com/duynguyenaver/blognaver/commit/742edb92cacd29707cd3d59ee3844cb354ffc804): ci(tts): validate Gen.G pronunciation before merge
- [c7d8820f36](https://github.com/duynguyenaver/blognaver/commit/c7d8820f36be140685dfadf43f6197043ede2833): test(tts): allow versioned Voice Fixer script in URL importer test

## Kết quả kiểm chứng

- CI từng lỗi: [run #41291007822](https://github.com/duynguyenaver/blognaver/actions/runs/41291007822).
- CI chạy thành công sau bản sửa: [run #41291097441](https://github.com/duynguyenaver/blognaver/actions/runs/41291097441).
- Bản thay đổi đã merge: [PR #280](https://github.com/duynguyenaver/blognaver/pull/280).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/280)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
