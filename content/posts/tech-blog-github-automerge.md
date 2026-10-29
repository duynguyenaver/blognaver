---
title: "Auto Merge trên GitHub: Cơ chế kiểm tra SHA, CI xanh và deploy sau merge của BlogNaver"
date: 2026-10-29T09:14:00+07:00
draft: false
series: ["tech-blog"]
seriesOrder: 4
slug: "tech-blog-github-automerge"
description: "Giải mã workflow Auto Merge BlogNaver: kiểm tra CI, SHA, review, squash merge và kích hoạt Hugo Pages deployment."
categories: ["Công nghệ", "Tech Blog"]
tags: ["series", "Tech Blog", "BlogNaver", "GitHub Actions", "DevOps", "Auto Merge"]
author: "Duy Nguyen"
---

*Tech Blog · Kỳ 4/4 · Nghiên cứu dựa trên source BlogNaver tại thời điểm 29/10/2026.*

Một Pull Request chuyển màu nút bấm, một PR khác thêm CMS và một PR nữa sửa build. Nếu mỗi lần đều phải mở GitHub rồi bấm Merge, dự án cá nhân sẽ tốn nhiều thao tác lặp lại. BlogNaver vì thế xây cơ chế **Auto Approve & Merge After Green Tests**. Nhưng “CI xanh là merge” mới chỉ là mô tả giản lược; pipeline thực tế phải phòng tình trạng commit thay đổi giữa lúc kiểm tra và lúc merge.

## Chuỗi sự kiện bắt đầu ở đâu?

PR mới hướng tới `main` kích hoạt `PR Bug Checker`. Workflow này có quyền `contents: read`, dựng Hugo, chạy bài test tri thức và audit đầu ra. Khi công việc hoàn tất, GitHub phát ra sự kiện `workflow_run: completed`. Workflow `.github/workflows/auto-approve.yml` lắng nghe sự kiện ấy.

Điều kiện đầu tiên là lượt chạy thực sự xuất phát từ PR và `conclusion == success`. Một PR fail hoặc workflow không hợp lệ sẽ dừng tại đây. Tách workflow kiểm tra và workflow có quyền write là ranh giới bảo mật quan trọng: code của PR không nên tự chạy trong môi trường nắm quyền merge.

## Vì sao Auto Merge kiểm tra lại mọi thứ?

Script dùng GitHub API để nhận diện chính xác PR gắn với run. Sau đó nó kiểm tra:

**PR hợp lệ:** Đang mở, không phải draft, base là `main`, branch nằm trong cùng repository — không lấy mã từ fork chưa được tin cậy.

**SHA hiện tại:** `pr.head.sha` phải bằng SHA đã được Bug Checker kiểm tra. Nếu ai đó đẩy thêm commit sau khi CI xanh, kết quả cũ không được sử dụng để merge source mới.

**Job thành công:** Run phải có đúng job `Bug Checker — Hugo (3 attempts max)` hoàn tất thành công, không chỉ dựa vào tên workflow.

**Các check khác:** Workflow đọc check runs trên commit hiện tại. Nếu có check fail hoặc còn pending, nó dừng; có cơ chế đợi một khoảng ngắn để các check đang chạy hoàn tất.

**Quyền review:** Script thử gửi APPROVE bằng GitHub API. GitHub có thể từ chối nếu thiếu quyền `Allow GitHub Actions to create and approve pull requests` hoặc áp dụng quy định chống tự duyệt. Khi không được phép duyệt, workflow dừng và báo lý do.

**Mergeability + compare-and-swap:** Trước khi merge, script lấy PR lần cuối. Nó chỉ gọi squash merge nếu SHA còn đúng, PR chưa đóng và không có conflict đã biết. GitHub REST API hỗ trợ trường `sha`; nếu head đã đổi, API có thể từ chối thay vì merge nhầm commit.

## Vì sao còn một bước deploy riêng sau merge?

GitHub Actions thường **không tạo workflow run mới cho các sự kiện phát sinh từ thao tác dùng `GITHUB_TOKEN`**, ví dụ push khi merge bởi workflow. GitHub quy định ngoại lệ cho `workflow_dispatch` và `repository_dispatch`. Vì vậy `auto-approve.yml` của BlogNaver gọi `createWorkflowDispatch` với `hugo.yml` trên `main` sau khi merge.

Sau đó workflow production build Hugo, tạo index và snapshot phục vụ CMS, upload Pages artifact rồi deploy lên GitHub Pages. Đây là một chuỗi riêng. Trạng thái “PR merged” không có nghĩa “Pages deployed”, và “Pages deployed” cũng chưa chứng minh giao diện đã được kiểm tra trên trình duyệt.

## Nếu một bước bị lỗi thì sao?

- **Bug Checker fail:** Không auto-approve, không merge. Người phát triển sửa source rồi push commit mới để chạy lại.
- **SHA lỗi thời:** Không merge; đợi CI kiểm tra revision mới.
- **Conflict:** Không merge; chỉ conflict đã được Safe Conflict Fixer cho phép mới có thể nhận bản vá giới hạn.
- **APPROVE bị GitHub chặn:** Dừng, báo thiếu quyền hoặc cần review hợp lệ.
- **Merge xong nhưng dispatch deploy lỗi:** Merge đã xảy ra; workflow đánh dấu lỗi và yêu cầu kích hoạt `hugo.yml` lại. Không nên nói “merge thất bại” trong trường hợp này.
- **Deploy pass nhưng trang lỗi:** Cần hotfix bằng PR khác hoặc quy trình rollback có kiểm chứng.

## Auto Merge có thực sự “thông minh”?

Nó không đánh giá giá trị biên tập của bài viết hoặc xác minh mọi hành vi UI. Điểm mạnh của Auto Merge là **quyết định có điều kiện trên bằng chứng kỹ thuật**: chỉ mã đã được kiểm tra, ở đúng commit, không còn pending/failed checks và đáp ứng policy mới được đưa vào `main`. Đây là tự động hóa quy tắc, không phải thay thế hoàn toàn người review.

Với một blog cá nhân, sự tự động hóa ấy giúp giảm thao tác, nhất là khi nhiều PR nhỏ được tạo liên tục. Nhưng các thay đổi liên quan token, quyền ghi GitHub, dữ liệu cá nhân hoặc logic auth vẫn cần đánh giá an toàn riêng; build thành công không có nghĩa không có lỗ hổng.

## Kết luận toàn series

Từ Deployment Culture đến Auto Fixer, Knowledge Base và Auto Merge, ta thấy cùng một triết lý: **tự động hóa những quyết định đã có tiêu chuẩn, ghi lại điều chưa chắc chắn và không bỏ qua bước xác minh cuối cùng**. Một pipeline trưởng thành không chỉ giúp code ra production nhanh hơn; nó còn khiến mọi người biết chính xác khi nào có thể tin một bản deploy.

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
