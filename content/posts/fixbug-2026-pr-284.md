---
title: "Fix Bug 2026: Expected route missing — PR #284"
date: "2026-11-01T09:16:57.000Z"
draft: false
slug: "fixbug-2026-pr-284"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #284"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 284
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #284](https://github.com/duynguyenaver/blognaver/pull/284) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** data(tts): train 1 pronunciation correction(s).

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** Expected route missing.

**Hướng kiểm tra:** Inspect page front matter, drafts, menu links, permalink config and published public directory.

Chi tiết được lấy từ [CI run thất bại #41292070757](https://github.com/duynguyenaver/blognaver/actions/runs/41292070757). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- scripts/test-tts-pronunciation-training.mjs (modified, +12/-3)
- static/tien-ich/text-to-speech/pronunciation-dictionary.json (modified, +2/-2)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/284/files) để đối chiếu.

## Các commit để đối chiếu

- [c3303ed709](https://github.com/duynguyenaver/blognaver/commit/c3303ed7096c3ef71b30576e420a1acef82f4cef): data(tts): train pronunciation corrections
- [b717f0de9c](https://github.com/duynguyenaver/blognaver/commit/b717f0de9c960109dd08259d3d27b6e85fa08e37): test(tts): respect caseSensitive and dynamic dictionary size in pronunciation PR checks

## Kết quả kiểm chứng

- CI từng lỗi: [run #41292070757](https://github.com/duynguyenaver/blognaver/actions/runs/41292070757).
- CI chạy thành công sau bản sửa: [run #41292388826](https://github.com/duynguyenaver/blognaver/actions/runs/41292388826).
- Bản thay đổi đã merge: [PR #284](https://github.com/duynguyenaver/blognaver/pull/284).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/284)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
