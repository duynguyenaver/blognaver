---
title: "Khi nào một lỗi CI trở thành case study? Bộ lọc Fix Bug 2026 của BlogNaver"
date: 2026-10-30T20:06:00+07:00
draft: false
description: "Vì sao một Pull Request được viết thành bài case study? Cách BlogNaver kiểm tra CI, commit, log lỗi và Knowledge Base trước khi xuất bản."
categories: ["Công nghệ", "Fix Bug"]
tags: ["CI/CD", "GitHub Actions", "Debugging", "Case Study"]
series: ["fix-bug-2026"]
author: "BlogNaver"
---

Không phải cứ PR được merge, hay có nhãn *bug*, thì BlogNaver sẽ viết một bài case study. Chuỗi **Fix Bug 2026** chỉ chọn những trường hợp có dấu vết kỹ thuật đủ rõ: một lần kiểm tra CI đã lỗi, mã nguồn được thay đổi và một phiên bản mới vượt qua kiểm tra.

Đó là khác biệt giữa thông báo “deploy thành công” và một bài học có thể đối chiếu với bằng chứng.

## Chín cửa kiểm tra trước khi viết bài

Bộ lọc trong `scripts/publish-fixbug-postmortem.mjs` thực hiện lần lượt:

1. **PR thực sự đã merge vào nhánh `main`** của BlogNaver. Đóng PR mà không merge không đủ điều kiện.
2. **Không tạo vòng lặp.** PR do `github-actions[bot]` tạo hoặc có tiêu đề thuộc nhóm Fix Bug 2026 sẽ bị loại khỏi đợt xét này.
3. **Không xuất bản trùng.** Script kiểm tra bài `content/posts/fixbug-2026-pr-<số PR>.md` đã có trên `main` chưa.
4. **Có ít nhất một lượt PR Bug Checker thành công** và liên kết được với PR.
5. **Có một lượt Bug Checker thất bại trước đó trên SHA khác.** Chỉ retry cùng phiên bản mà sau đó xanh không tự động được coi là sửa lỗi.
6. **PR có ít nhất hai commit**, để có lịch sử thay đổi để đối chiếu.
7. **Đọc được log của job thất bại.** Nếu không thu thập được log, script không đủ bằng chứng.
8. **Log khớp với dấu hiệu lỗi xác định (`deterministic`) trong `data/ci/bug-knowledge.json`.** Lỗi mạng thoáng qua không mặc nhiên đáp ứng điều kiện này.
9. **Có danh sách file thay đổi** để độc giả có thể mở diff kiểm chứng.

Một PR xanh ngay từ lần đầu là thành công của quy trình phát triển, nhưng **không phải case study “đã sửa lỗi CI”** theo những tiêu chí trên.

## Nhãn trên PR đóng vai trò gì?

| Nhãn | Ý nghĩa |
| --- | --- |
| `fixbug:github-only` | Không đủ điều kiện tạo bài công khai; xem log workflow để biết lý do. |
| `fixbug:evidence-confirmed` | Đã tìm thấy bằng chứng CI thất bại, revision sau thành công và log khớp Knowledge Base. |
| `fixbug:published` | Bài case study tương ứng đã có trên `main`. |

**Nhãn không phải tấm vé xuất bản.** Việc gắn nhãn chỉ phản ánh trạng thái do bộ lọc xác định. Chỉ riêng nhãn “bug” hoặc “evidence-confirmed” không thể thay thế log, lịch sử commit và kết quả CI thực tế.

## Bài viết lấy nội dung từ đâu?

Sau khi đủ điều kiện, hệ thống tổng hợp thông tin từ PR, commit, danh sách file và CI logs. Bài viết đưa đường dẫn tới run thất bại, run thành công và Knowledge Base. Phần tường thuật được tạo theo quy tắc từ bằng chứng GitHub, không dùng AI để tự suy đoán nguyên nhân.

Tuy nhiên, **hai lượt CI khác nhau chỉ chứng minh kết quả kiểm tra đã thay đổi**, không chứng minh chính xác một dòng mã là nguyên nhân gây lỗi. Muốn kết luận root cause cần thêm đối chiếu diff, tái hiện lỗi và kiểm thử thực tế. CI xanh cũng không thay thế kiểm thử website production.

## Một ví dụ giả định

Một PR có lịch sử như sau: commit A chạy CI thất bại; developer sửa mã và tạo commit B; commit B chạy CI thành công; PR được merge. Nếu log ở A đọc được và khớp một mẫu lỗi deterministic trong Knowledge Base, đồng thời đáp ứng các điều kiện còn lại, PR đó **có thể** trở thành bài Fix Bug 2026.

Ngược lại, nếu A chỉ lỗi mạng tạm thời, nếu log không truy xuất được, hoặc nếu PR chỉ có lần CI xanh đầu tiên, bài viết sẽ bị bỏ qua thay vì dựng lên một câu chuyện sửa lỗi.

## Từ bằng chứng đến bài blog: vẫn phải qua PR

Workflow `publish-fixbug-2026.yml` có thể chạy khi một PR được merge hoặc được gọi với số PR cần đánh giá. Việc chạy workflow chỉ bắt đầu **xét điều kiện**; nó không bảo đảm bài blog sẽ được viết.

Sau khi đủ bằng chứng, cơ chế xuất bản được sửa theo chính sách của BlogNaver: tạo branch nội dung riêng, mở PR bình thường, chờ CI xanh rồi auto-merge và deploy. Thay đổi này được theo dõi tại [PR #152](https://github.com/duynguyenaver/blognaver/pull/152). Bài viết này cũng tuân theo quy trình PR-first; không ghi trực tiếp lên `main`.

## Tại sao công khai bộ lọc?

Độc giả có thể kiểm chứng mỗi bài học từ nguồn gốc thay vì chỉ đọc một lời khẳng định. Người phát triển được khuyến khích giữ log, commit rõ ràng, phân biệt lỗi mã nguồn và lỗi hạ tầng, đồng thời nêu giới hạn của bằng chứng. Đó là mục tiêu của chuỗi **Fix Bug 2026**: tự động hóa báo cáo nhưng không tự động biến suy đoán thành sự thật.

**Mã nguồn tham khảo:** [Script tạo case study](https://github.com/duynguyenaver/blognaver/blob/main/scripts/publish-fixbug-postmortem.mjs), [Workflow xuất bản](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/publish-fixbug-2026.yml), [CI Knowledge Base](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json).

*Bài viết phản ánh cơ chế được kiểm tra trong mã nguồn ngày 30/10/2026; workflow có thể tiếp tục được cải tiến.*
