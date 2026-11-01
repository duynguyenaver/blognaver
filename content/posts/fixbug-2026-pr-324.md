---
title: "Fix Bug 2026: fix(ci): automatically merge verified vocabulary data PRs and deploy Pages — PR #324"
date: "2026-11-01T13:29:26.000Z"
draft: false
slug: "fixbug-2026-pr-324"
description: "Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #324"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 324
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

[PR #324](https://github.com/duynguyenaver/blognaver/pull/324) ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix(ci): automatically merge verified vocabulary data PRs and deploy Pages.

**Chế độ bằng chứng:** Engineering postmortem. **Nhóm lỗi:** Documented product defect and code repair.

**Hướng kiểm tra:** Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established..

Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa](https://github.com/duynguyenaver/blognaver/pull/324). Không có log thất bại để xác minh độc lập nguyên nhân.

## Những file có thay đổi trong PR

- .github/workflows/trilingual-vocabulary-sync.yml (modified, +25/-7)
- AGENTS.md (modified, +9/-0)
- scripts/merge-verified-vocabulary-pr.sh (added, +64/-0)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/324/files) để đối chiếu.

## Các commit để đối chiếu

- [eb84232e30](https://github.com/duynguyenaver/blognaver/commit/eb84232e30560a0b2f2e1320769aa27b4e1faa52): fix(ci): verify generated vocabulary data PR checks then merge and deploy without branch protection auto-merge API
- [b3302d25ce](https://github.com/duynguyenaver/blognaver/commit/b3302d25cef8935d2ce45d60cbdaaece334fe9d6): fix(vocab CI): merge data PR only after green checks and dispatch Pages without manual approval
- [be35dca266](https://github.com/duynguyenaver/blognaver/commit/be35dca266ffa8e52939f47020991735672259f6): fix(vocab CI): grant workflow dispatch rights and recover stranded data PRs
- [2f64a7626c](https://github.com/duynguyenaver/blognaver/commit/2f64a7626cf5fb2c38399cb8447000d8896f6d4f): docs(agents): record auto-merge branch-protection failure and CI-verified recovery playbook
- [a7d8cb4637](https://github.com/duynguyenaver/blognaver/commit/a7d8cb46375a697ff28abf105b54ba58a3327fa6): fix(ci): correctly bind check conclusion before jq array membership test

## Kết quả kiểm chứng

- Chưa xác minh được CI thất bại trước khi sửa.
- CI chạy thành công sau bản sửa: [run #41311447941](https://github.com/duynguyenaver/blognaver/actions/runs/41311447941).
- Bản thay đổi đã merge: [PR #324](https://github.com/duynguyenaver/blognaver/pull/324).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/324)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
