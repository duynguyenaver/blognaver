---
title: "Fix Bug 2026: Hugo template or partial missing — PR #124"
date: "2026-10-30T03:55:45.000Z"
draft: false
slug: "fixbug-2026-pr-124"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #124"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 124
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, CI logs và Knowledge Base, không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #124](https://github.com/duynguyenaver/blognaver/pull/124) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge. Bài ghi lại những tín hiệu có thể kiểm chứng, không khẳng định đã chứng minh được một dòng mã gây lỗi cụ thể.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix: wider home post list and public PIN-free pagination.

**Nhóm lỗi nhận diện bằng quy tắc:** Hugo template or partial missing.

**Hướng kiểm tra từ Knowledge Base:** Inspect first nested template error, check layouts override precedence and version compatibility.

Chi tiết được lấy từ [CI run thất bại #40999752139](https://github.com/duynguyenaver/blognaver/actions/runs/40999752139). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- assets/css/_custom.scss (modified, +20/-0)
- static/access-gate.js (modified, +1/-1)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/124/files) để đối chiếu.

## Các commit để đối chiếu

- [89d0a32b76](https://github.com/duynguyenaver/blognaver/commit/89d0a32b76d27aedc0b3331d08cb1be6fa98f246): fix(access): exempt public home pagination from PIN gate
- [ffe6ae9074](https://github.com/duynguyenaver/blognaver/commit/ffe6ae9074c1b9548fe3313f8cf9d9619b3f0b27): style(home): widen responsive post listing on home pagination
- [ad4a888919](https://github.com/duynguyenaver/blognaver/commit/ad4a888919ef75e4384080b8d94fcea9db14a575): fix(ci): replace Sass-incompatible min mixed-unit expression with calc

## Kết quả kiểm chứng

- CI từng lỗi: [run #40999752139](https://github.com/duynguyenaver/blognaver/actions/runs/40999752139).
- CI chạy thành công sau bản sửa: [run #40999994043](https://github.com/duynguyenaver/blognaver/actions/runs/40999994043).
- Bản thay đổi đã merge: [PR #124](https://github.com/duynguyenaver/blognaver/pull/124).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/124)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
