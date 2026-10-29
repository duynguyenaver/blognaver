---
title: "Knowledge Base và AGENTS.md: Biến lịch sử lỗi thành kinh nghiệm kiểm thử có thể tái sử dụng"
date: 2026-10-29T09:13:00+07:00
draft: false
series: ["tech-blog"]
seriesOrder: 3
slug: "tech-blog-knowledge-base-agents-md"
description: "Khám phá AGENTS.md, bug-knowledge.json và cách BlogNaver chuyển sự cố đã xác minh thành kiến thức kiểm thử có cấu trúc."
categories: ["Công nghệ", "Tech Blog"]
tags: ["series", "Tech Blog", "BlogNaver", "GitHub Actions", "DevOps", "Knowledge Base"]
author: "Duy Nguyen"
---

*Tech Blog · Kỳ 3/4 · Nghiên cứu dựa trên source BlogNaver tại thời điểm 29/10/2026.*

Khi một sự cố xảy ra lần đầu, người phát triển thường phải đọc log, tra tài liệu, thử một bản sửa rồi kiểm chứng. Nếu lỗi lặp lại mà vẫn phải nghiên cứu từ đầu, dự án đang trả tiền cho cùng một bài học nhiều lần. **Knowledge Base** biến quá trình chữa cháy thành một hệ thống tích lũy kinh nghiệm. Nhưng muốn chính xác, cần phân biệt tài liệu hướng dẫn con người với cơ sở dữ liệu mà CI thật sự đọc.

## AGENTS.md là gì trong BlogNaver?

`AGENTS.md` nằm ở gốc repo và mô tả nguyên tắc tác nghiệp cho coding agent và người phát triển. Nó ghi lại kiến trúc hiện tại, cách xử lý PR conflict, giới hạn bảo mật, quy tắc kiểm thử, những sự cố cụ thể đã gặp và nguyên tắc không được tuyên bố “đã sửa” khi chưa có bằng chứng.

Ví dụ, file ghi nhận sự cố thiếu `origin/main` history khi CI checkout dẫn tới `git merge-base origin/main HEAD` lỗi 128. Cách sửa đã xác minh là checkout `fetch-depth: 0` và fetch nhánh main trước khi chạy diff audit. Hồ sơ sự cố gồm **triệu chứng → nguyên nhân xác minh → cách sửa → cách kiểm chứng**.

Nhưng có một ranh giới quan trọng: **AGENTS.md không tự biến thành bộ nhớ sống mà GitHub Actions tự suy luận**. Nó là văn bản hướng dẫn. CI của BlogNaver dùng dữ liệu riêng để phân loại lỗi.

## Cơ sở dữ liệu thực sự nằm ở đâu?

`data/ci/bug-knowledge.json` là knowledge base có cấu trúc. Mỗi mục có thể chứa:

- `id`: mã sự cố ổn định để theo dõi;
- `regex`: mẫu lỗi cần tìm trong log;
- `kind`: lỗi deterministic hay có thể mang tính hạ tầng;
- `advice`: hướng dẫn điều tra/sửa;
- `source`: tài liệu đối chiếu;
- `evidence`: bằng chứng hoặc phạm vi lịch sử.

`scripts/ci-classify-failure.py` đọc JSON này, tìm các regex trong phần cuối của CI log và ghi báo cáo chẩn đoán. `scripts/test-ci-knowledge.py` cung cấp fixture để tránh cập nhật rule gây lỗi phân loại. Đây là cách biến những nhận định bằng ngôn ngữ tự nhiên thành dữ liệu có thể thử bằng máy.

## Vì sao cần cả hai lớp?

Giả sử `AGENTS.md` ghi: “Không cố retry ba lần với lỗi JS syntax, phải chỉnh source”. Đây là quy tắc vận hành. Knowledge Base có thể chứa pattern `SyntaxError` và lời khuyên `node --check` để CI tự nhận diện lỗi. Hai lớp bổ trợ nhau: một lớp dành cho quyết định và quy trình, lớp còn lại dành cho matching nhất quán.

Một ví dụ khác là xung đột khi chuyển theme. Văn bản giải thích sự khác nhau giữa Stack, Blowfish và DoIt, tránh dùng “ours/theirs” một cách mù quáng. Workflow Safe Conflict Fixer chỉ chạy khi cấu hình cụ thể khớp điều kiện đã kiểm chứng. Nếu PR thay đổi nhiều file không liên quan, sửa tự động phải dừng.

## Từ nhật ký lỗi đến một knowledge entry tốt

Một mục tri thức đáng tin cậy nên trả lời đủ sáu câu hỏi:

1. **Symptom:** Log thực tế báo gì, tại bước nào?
2. **Environment:** Hugo/Node/theme và đường dẫn nào liên quan?
3. **Root cause:** Đã chứng minh nguyên nhân bằng cách nào?
4. **Remedy:** Patch nhỏ nhất cần thay đổi là gì?
5. **Verification:** Lệnh kiểm tra và run nào chứng minh sửa thành công?
6. **Guardrail:** Khi nào tuyệt đối không áp dụng công thức này?

Nếu chỉ ghi “Hugo build fail, thử cài lại module”, entry sẽ quá rộng và dễ gây hại. Nếu lưu đường dẫn log/commit sai hoặc pattern quá tổng quát, bộ phân loại sẽ tạo nhiều false positive. Knowledge Base tốt phải **cụ thể, có phiên bản và có bằng chứng**, chứ không chỉ ngày càng dài.

## Có phải hệ thống đang “học máy” sau mỗi lần deploy?

Chưa. Từ source hiện hành có thể xác nhận quy trình cập nhật tri thức **bằng cách biên tập rule, fixture và tài liệu**. Không có cơ chế tự huấn luyện mô hình hay tự rút kinh nghiệm ngoài sự giám sát rồi viết lại `AGENTS.md` mỗi khi fail. Khi nói “hệ thống thông minh hơn”, ý đúng là **phạm vi nhận diện sự cố được mở rộng nhờ kinh nghiệm đã mã hóa**, không phải AI liên tục học không cần con người.

Tương lai có thể bổ sung một workflow đề nghị tạo knowledge entry sau incident đã fix, kèm link failed/successful run và diff; nhưng entry mới cần review trước khi được CI sử dụng. Tri thức không được lấy nguyên từ log hoặc PR body chưa tin cậy rồi đưa thẳng thành lệnh thực thi.

## Chống tri thức lỗi thời

BlogNaver từng chuyển qua nhiều theme. Có những đoạn cũ trong `AGENTS.md` nói Blowfish, trong khi nội dung mới xác nhận DoIt đang hoạt động. Nếu code agent đọc lịch sử mà không nhìn trạng thái hiện tại, nó có thể sửa nhầm template. Cách xử lý bền vững là phân tách **active architecture** và **historical incidents**, gắn ngày/version, đánh dấu rule hết hiệu lực và yêu cầu đọc file thực tại trước khi can thiệp.

## Kết luận

Knowledge Base của BlogNaver không phải phép màu: đó là **trí nhớ kỹ thuật có cấu trúc**, giúp sự cố lặp lại được nhận diện nhanh và an toàn hơn. Kỳ cuối sẽ cho thấy sau khi CI xanh, vì sao hệ thống Auto Merge vẫn phải kiểm tra lại nhiều điều kiện trước khi đưa mã lên `main`.

## Đọc tiếp series Tech Blog

- [Kỳ 1: Deployment Culture: Vì sao deploy thành công chưa có nghĩa website đã đúng?](/blognaver/bai-viet/tech-blog-deployment-culture/)
- [Kỳ 2: Auto Fixer khi Pull Request thất bại: hệ thống BlogNaver thông minh đến đâu?](/blognaver/bai-viet/tech-blog-autofixer-pr-failed/)
- [Kỳ 3: Knowledge Base và AGENTS.md: Biến lịch sử lỗi thành kinh nghiệm kiểm thử có thể tái sử dụng](/blognaver/bai-viet/tech-blog-knowledge-base-agents-md/)
- [Kỳ 4: Auto Merge trên GitHub: Cơ chế kiểm tra SHA, CI xanh và deploy sau merge của BlogNaver](/blognaver/bai-viet/tech-blog-github-automerge/)

---

### Nguồn và giới hạn kiểm chứng

- [GitHub Docs — Triggering workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub Docs — Pull Requests REST API](https://docs.github.com/en/rest/pulls/pulls)
- [BlogNaver — PR Bug Checker](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/pr-bug-checker.yml)
- [BlogNaver — Auto Approve & Merge](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/auto-approve.yml)
- [BlogNaver — AGENTS.md](https://github.com/duynguyenaver/blognaver/blob/main/AGENTS.md)
- [BlogNaver — Bug Knowledge Base](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json)

*Thông tin về chức năng hiện hành được kiểm chứng từ source repository. Những đề xuất cải tiến được trình bày như thiết kế tương lai, không phải tính năng đã triển khai. Quy trình và workflow có thể thay đổi sau khi bài đăng.*
