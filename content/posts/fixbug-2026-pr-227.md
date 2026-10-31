---
title: "Fix Bug 2026: JavaScript parse error — PR #227"
date: "2026-10-31T06:24:43.000Z"
draft: false
slug: "fixbug-2026-pr-227"
description: "Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #227"
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 227
author: "BlogNaver CI Reporter"
---

*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, code diff và kết quả kiểm tra; CI logs chỉ được viện dẫn khi tồn tại. Không dùng AI tự tạo nguyên nhân.*

Trong quá trình phát triển BlogNaver, [PR #227](https://github.com/duynguyenaver/blognaver/pull/227) từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.

## Bối cảnh và dấu hiệu lỗi

**PR:** CMS V2: centralize GitHub and Gemini under Integration.

**Chế độ bằng chứng:** CI recovery. **Nhóm lỗi:** JavaScript parse error.

**Hướng kiểm tra:** Run node --check on changed JavaScript; inspect source and avoid retrying unchanged code.

Chi tiết được lấy từ [CI run thất bại #41176125518](https://github.com/duynguyenaver/blognaver/actions/runs/41176125518). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.

## Những file có thay đổi trong PR

- static/tien-ich/cms-v2/index.html (modified, +3/-3)
- static/tien-ich/cms-v2/integration.js (added, +16/-0)
- static/tien-ich/cms-v2/v2.js (modified, +2/-2)

Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR](https://github.com/duynguyenaver/blognaver/pull/227/files) để đối chiếu.

## Các commit để đối chiếu

- [1370d2cdd8](https://github.com/duynguyenaver/blognaver/commit/1370d2cdd823d23f2986728fb4a8d1c5d9faeceb): feat(cms-v2): central Integration screen for GitHub and Gemini
- [eec8c302c6](https://github.com/duynguyenaver/blognaver/commit/eec8c302c6d6c24302ccacb77bed5d5049ba2483): feat(cms-v2): notify Integration of GitHub connection changes
- [1919923dca](https://github.com/duynguyenaver/blognaver/commit/1919923dca22d861938d6cff7ce333209b4f4378): feat(cms-v2): live connection validation and unified Gemini credential controls
- [15b5fcc0e5](https://github.com/duynguyenaver/blognaver/commit/15b5fcc0e5f74d0856483440e1b299cfeebcb3b0): fix(cms-v2): gate Gemini classification on validated Integration status
- [17dddcc13f](https://github.com/duynguyenaver/blognaver/commit/17dddcc13ffa6a0a3ae6b24713304ea54e5d480e): fix(cms-v2): resolve CI JavaScript parse error in Integration status event

## Kết quả kiểm chứng

- CI từng lỗi: [run #41176125518](https://github.com/duynguyenaver/blognaver/actions/runs/41176125518).
- CI chạy thành công sau bản sửa: [run #41176449305](https://github.com/duynguyenaver/blognaver/actions/runs/41176449305).
- Bản thay đổi đã merge: [PR #227](https://github.com/duynguyenaver/blognaver/pull/227).

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
- [Lịch sử PR](https://github.com/duynguyenaver/blognaver/pull/227)

*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*
