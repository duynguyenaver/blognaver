---
title: "Fix Bug 2026: fix(language): live Google Sheets A–C sync and secure Gemini D–E writeback — PR #321"
date: "2026-11-01T13:06:33.000Z"
draft: false
slug: "fixbug-2026-pr-321"
description: "Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #321"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 321
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

[PR #321](https://github.com/duynguyenaver/blognaver/pull/321) ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.

## Bối cảnh và dấu hiệu lỗi

**PR:** fix(language): live Google Sheets A–C sync and secure Gemini D–E writeback.

**Chế độ bằng chứng:** Engineering postmortem. **Nhóm lỗi:** Documented product defect and code repair.

**Hướng kiểm tra:** Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established..

Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa](https://github.com/duynguyenaver/blognaver/pull/321). Không có log thất bại để xác minh độc lập nguyên nhân.

## Những file có thay đổi trong PR

- .github/workflows/trilingual-vocabulary-sync.yml (modified, +3/-0)
- docs/google-apps-script/LanguageLab.gs (added, +124/-0)
- scripts/sync-trilingual-vocabulary.py (modified, +65/-3)
- scripts/test-sync-trilingual-vocabulary.py (modified, +25/-0)
- static/tien-ich/hoc-tieng-viet-han-anh/README.md (modified, +51/-36)
- static/tien-ich/hoc-tieng-viet-han-anh/index.html (modified, +4/-4)
- static/tien-ich/hoc-tieng-viet-han-anh/live-sheet.js (added, +64/-0)
- static/tien-ich/hoc-tieng-viet-han-anh/study.js (modified, +28/-5)
- static/tien-ich/hoc-tieng-viet-han-anh/vocabulary.json (modified, +17/-3)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/321/files) để đối chiếu.

## Các commit để đối chiếu

- [37a5f8c03e](https://github.com/duynguyenaver/blognaver/commit/37a5f8c03e0a50d367855fda318b8b7128959ba0): fix(vocab): add public Google Sheets live read with cache-safe merge
- [f49c1596a1](https://github.com/duynguyenaver/blognaver/commit/f49c1596a14b62aabcc812693c258160f8ba2530): fix(vocab): overlay live Google Sheet rows and show accurate live status
- [eb83870abf](https://github.com/duynguyenaver/blognaver/commit/eb83870abf8899d67ab079a8ed1cd1c85097fe78): fix(vocab): load public live bridge and document true sync behavior
- [bd68506166](https://github.com/duynguyenaver/blognaver/commit/bd685061669b9598458e7a54ced83179b67781c6): fix(vocab): parse actual A:E headers and safely write Gemini D/E back with editor access
- [d0e3a847a6](https://github.com/duynguyenaver/blognaver/commit/d0e3a847a6be822d12e57bc7956fff534998bda5): feat(vocab): documentable owner-authorized Apps Script to dispatch and write back AI safely
- [5557849110](https://github.com/duynguyenaver/blognaver/commit/55578491100cda61d5e6a66863069fdaa4f0a2f9): test(vocab): verify exact owner A:E headers and source-context preservation
- [0da09bac9f](https://github.com/duynguyenaver/blognaver/commit/0da09bac9fa3a08f60dce8d0b634b278290190f0): ci(vocab): validate live bridge and enable secure Sheets writeback when authenticated
- [e3f0baadd5](https://github.com/duynguyenaver/blognaver/commit/e3f0baadd56c1b11da76a6bdd46691bc61b77a38): docs(vocab): give safe Viewer and Apps Script/service-account writeback setup

## Kết quả kiểm chứng

- Chưa xác minh được CI thất bại trước khi sửa.
- CI chạy thành công sau bản sửa: [run #41309591880](https://github.com/duynguyenaver/blognaver/actions/runs/41309591880).
- Bản thay đổi đã merge: [PR #321](https://github.com/duynguyenaver/blognaver/pull/321).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/321)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
