---
title: "Deployment Culture: Vì sao deploy thành công chưa có nghĩa website đã đúng?"
date: 2026-10-29T09:11:00+07:00
draft: false
series: ["tech-blog"]
seriesOrder: 1
slug: "tech-blog-deployment-culture"
description: "Phân tích Deployment Culture của BlogNaver từ PR, CI, auto merge đến xác minh GitHub Pages và giao diện production."
categories: ["Công nghệ", "Tech Blog"]
tags: ["series", "Tech Blog", "BlogNaver", "GitHub Actions", "DevOps", "Deployment"]
author: "Duy Nguyen"
---

*Tech Blog · Kỳ 1/4 · Nghiên cứu dựa trên source BlogNaver tại thời điểm 29/10/2026.*

Một thay đổi CSS có thể mất chưa đến năm phút để viết, nhưng từ dòng code đầu tiên đến khi người đọc thực sự nhìn thấy nó trên website là cả một chuỗi kiểm chứng. Trong quá trình xây dựng BlogNaver bằng Hugo và GitHub Pages, có thời điểm Pull Request đã mở, CI báo xanh, thậm chí được merge, nhưng giao diện ngoài production vẫn không giống mong đợi. Những lần đó cho thấy một nguyên tắc: **deployment là một quá trình xác minh, không chỉ là hành động bấm nút Deploy**.

## Deployment Culture là văn hóa gì?

Deployment Culture không phải tên một phần mềm, mà là tập hợp cách đội phát triển quản lý thay đổi: mỗi tính năng có nhánh riêng; mọi thay đổi được review qua Pull Request (PR); build tự động kiểm tra; production có tín hiệu quan sát; và người thực hiện phải nói đúng những gì đã được xác nhận. Một môi trường có thể deploy rất nhanh nhưng vẫn có chất lượng thấp nếu mọi người chỉ nhìn vào ô màu xanh của GitHub Actions.

BlogNaver là trường hợp nhỏ nhưng hữu ích: một trang blog cá nhân có Hugo, nhiều CMS tĩnh, các công cụ tiện ích, GitHub Actions và cơ chế merge có điều kiện. Các lớp này phụ thuộc lẫn nhau. CSS phù hợp với theme cũ chưa chắc tác động tới template DoIt đang được sử dụng. Một bài có `draft: false` nhưng ngày xuất bản ở tương lai vẫn có thể bị Hugo loại khỏi bản build. Việc viết đúng mã mới chỉ là **đầu vào** của quá trình xuất bản.

## Năm tầng của một deployment đáng tin cậy

**Tầng 1 — Source:** Mã phải ở đúng nhánh và đúng file được sử dụng. Ví dụ, sửa `extend-head.html` không giúp ích nếu template đang dùng không gọi partial đó. Vì vậy cần đối chiếu entry point và mã nguồn theme, không chỉ suy đoán selector CSS.

**Tầng 2 — Build:** Với BlogNaver, `.github/workflows/pr-bug-checker.yml` chạy Hugo v0.162.0; script `scripts/pr-bug-checker.sh` dựng site, tạo `posts-index.json` và chạy `scripts/ci-site-audit.py`. Bước này bắt các lỗi cú pháp JavaScript, trang đầu ra bị thiếu, đường dẫn và asset sai. Nhưng nó không thay thế kiểm thử trình duyệt.

**Tầng 3 — Review/Merge:** PR phải dựa trên commit còn hiện hành, không có conflict và vượt qua các checks liên quan. Khi một PR khác đã merge, nhánh đang mở có thể trở nên lỗi thời; CI xanh trên code cũ không đủ để bảo đảm merge an toàn.

**Tầng 4 — Deploy:** Workflow `.github/workflows/hugo.yml` build Hugo, tạo CMS index, snapshot workflow, upload artifact và dùng GitHub Pages để xuất bản. Merge bằng `GITHUB_TOKEN` không tự động tạo một lần chạy `push` mới theo quy tắc thông thường; vì vậy workflow Auto Merge của BlogNaver gọi `workflow_dispatch` tường minh sau khi merge thành công.

**Tầng 5 — Production verification:** Trang chủ thật, URL thật, ảnh thumbnail thật, responsive layout và hành vi click mới xác nhận yêu cầu UX. Có khác biệt lớn giữa “mã đã nằm trên main”, “Pages báo thành công”, “HTML có phần tử mới” và “độc giả thấy đúng giao diện”.

## Những lỗi thực tế đã dạy BlogNaver điều gì?

Một PR sửa CMS đã gặp `SyntaxError: Invalid regular expression flags`. Bug Checker phát hiện đúng, ba lượt chạy đều thất bại vì không có dòng source nào được thay đổi trong lúc retry. Chỉ khi mã được sửa rồi commit lại, lượt CI mới có thể vượt qua. Bài học là **retry không đồng nghĩa repair**.

Một tình huống khác xảy ra với bài viết đã deploy nhưng không xuất hiện trên trang chủ: ngày xuất bản sau thời điểm build khiến Hugo bỏ qua trang. Đây không phải lỗi hạ tầng deployment, mà là vấn đề logic dữ liệu và thời điểm công bố. Lại có trường hợp hai thumbnail ở cuối bài bị lệch vì CSS mới kế thừa class căn trái/phải của theme. Build không kiểm tra được bố cục ấy.

## Làm thế nào tăng tốc mà không đánh đổi chất lượng?

Tối ưu thời gian không có nghĩa xóa các bước kiểm tra. Workflow hiện hành cache Go/Hugo modules và không cố cập nhật module qua `hugo mod get` ở mọi lượt build. Production deploy dùng concurrency để hủy lượt cũ, ưu tiên revision mới của `main`. Đây là các thay đổi kỹ thuật giảm thời gian và sự lãng phí, nhưng **không có dữ liệu benchmark đối chứng ở đây để khẳng định số giây tiết kiệm cụ thể**.

Đối với thay đổi UI, nên có kiểm thử hồi quy giao diện bằng ảnh chụp desktop/mobile; đối với bài viết, nên xác nhận đường dẫn và điều kiện ngày/draft; đối với CMS, nên kiểm thử mở–sửa–lưu trên một bản sao dữ liệu. Chỉ sau khi các tín hiệu đều đạt, mới dùng chữ “đã hoàn tất”.

## Một mẫu báo cáo deployment minh bạch

Mỗi thay đổi nên có: **PR URL → commit SHA → trạng thái CI → trạng thái merge → Pages run → URL production được kiểm tra → lỗi còn tồn tại**. Thiếu mắt xích nào thì ghi “chưa xác minh” ở mắt xích đó. Văn hóa này có thể làm phần báo cáo dài hơn đôi chút, nhưng giảm những vòng sửa đi sửa lại do tuyên bố thành công quá sớm.

## Kết luận

Deployment Culture của BlogNaver nên được hiểu là **nhanh trong thực hiện, nghiêm ngặt trong bằng chứng**. Kỳ kế tiếp sẽ đi vào thành phần thường bị hiểu nhầm nhất: Auto Fixer. Hệ thống có thể nhận diện và phân loại lỗi, nhưng mức độ thực sự tự sửa tới đâu?

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
