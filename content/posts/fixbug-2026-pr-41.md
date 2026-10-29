---
title: "Fix Bug 2026 #1: Sửa lỗi JavaScript khiến CMS Tất cả bài viết failed CI"
date: 2026-10-29T19:56:00+07:00
draft: false
slug: "fixbug-2026-pr-41"
description: "Phân tích thực tế PR #41 của BlogNaver: lỗi Invalid regular expression flags, vì sao Bug Checker retry ba lần vẫn failed và cách sửa để CI xanh."
categories: ["Công nghệ", "Fix Bug"]
tags: ["fixbug", "series", "GitHub Actions", "JavaScript", "CI/CD", "BlogNaver"]
series: ["fix-bug-2026"]
seriesOrder: 1
author: "Duy Nguyen"
---

*Fix Bug 2026 · Kỳ 1 · Case study có thể kiểm chứng từ PR #41 của BlogNaver, ngày 29/10/2026.*

Một thay đổi giao diện CMS tưởng đơn giản — chuyển mục **Tất cả bài viết** từ sidebar chật hẹp sang trang quản lý riêng — đã khiến quy trình tự động của BlogNaver thất bại. Điều đáng chú ý không phải chỉ là lỗi JavaScript, mà còn là sự khác biệt giữa **CI tự nhận ra lỗi** và **hệ thống thật sự tự sửa lỗi**.

Trong bài này, chúng ta sẽ nghiên cứu một sự cố cụ thể: [Pull Request #41 – Dedicated All Posts workspace](https://github.com/duynguyenaver/blognaver/pull/41).

## 1. Bối cảnh: đổi UX của CMS nhưng đụng đến luồng mở bài viết

CMS ban đầu đặt danh sách bài ở trong sidebar trình biên tập. Khi số bài tăng, việc tìm, lọc, phân trang hoặc chọn bài sửa trở nên bất tiện. PR #41 tách phần này thành màn hình độc lập, có thể tìm kiếm và mở bài trực tiếp về editor qua URL.

Thay đổi liên quan đến JavaScript trong `static/cms/app.js`, đặc biệt là logic nhận `source` từ query string để xác định file Markdown cần mở. Vì URL phải được kiểm tra trước khi sử dụng, code có một biểu thức chính quy để xác nhận đường dẫn hợp lệ.

Ý tưởng kiểm tra đầu vào là đúng. Nhưng chính biểu thức được viết không hợp lệ về mặt cú pháp JavaScript, khiến bản build bị chặn từ rất sớm.

## 2. Triệu chứng: Bug Checker chạy lại ba lần nhưng không thành công

GitHub Actions ghi nhận hai lượt kiểm tra thất bại của nhánh PR #41:

- [Failed run #40876798512](https://github.com/duynguyenaver/blognaver/actions/runs/40876798512).
- [Failed run #40876960699](https://github.com/duynguyenaver/blognaver/actions/runs/40876960699).

Trong lượt thứ hai, log ghi lỗi quan trọng:

```text
SyntaxError: Invalid regular expression flags
Bug Checker failed all 3 attempts; stop here.
```

Thông báo đầu tiên cho thấy bộ phân tích JavaScript không thể đọc biểu thức chính quy. Thông báo thứ hai có nghĩa workflow đã thử tối đa ba lượt **kiểm tra**, chứ không phải đã tự tạo ba bản vá.

Điều này giải thích vì sao một hệ thống có Bug Checker, retry và Knowledge Base vẫn không làm CI xanh: nếu mã nguồn không đổi thì chạy `node --check` bao nhiêu lần cũng gặp cùng lỗi cú pháp.

## 3. Root cause: biểu thức regular expression ở đường dẫn bài viết

Lỗi xuất hiện khi code thêm khả năng mở bài từ trang riêng qua `?post=...&source=...`. Logic cũ đưa phép kiểm tra đường dẫn vào một literal RegExp, nhưng cách escape dấu slash, backslash và phần đuôi file bị sai.

Khi parser hiểu một phần nội dung là **flags** không hợp lệ, JavaScript ném `SyntaxError: Invalid regular expression flags`. Đây là lỗi deterministic: cùng source, cùng cú pháp, kết quả kiểm tra sẽ không thay đổi.

Cần phân biệt hai nhiệm vụ:

**Kiểm tra quyền truy cập đường dẫn:** Chỉ chấp nhận đường dẫn trong `content/posts/`, có phần mở rộng Markdown và không cho phép đi lên thư mục cha.

**Đảm bảo JavaScript hợp lệ:** Tránh tạo ra RegExp literal sai cú pháp ngay khi trang hoặc script được phân tích.

Điểm thiếu sót của PR là thêm kiểm tra đầu vào nhưng chưa kiểm tra chính cú pháp của phép kiểm tra đó.

## 4. Bản sửa đã áp dụng và bằng chứng

Commit sửa được ghi trên nhánh PR #41:

[**d3c7c817 — fix(ci): remove malformed regex and duplicate source binding in CMS deep link**](https://github.com/duynguyenaver/blognaver/commit/d3c7c817f873432f4524358c1283ae42e3a2d393).

Thay vì phụ thuộc vào biểu thức chính quy bị escape sai, bản sửa sử dụng các điều kiện chuỗi rõ ràng hơn để chọn đường dẫn:

```js
const filePath =
  sourcePath &&
  sourcePath.startsWith("content/posts/") &&
  sourcePath.endsWith(".md") &&
  !sourcePath.includes("..")
    ? sourcePath
    : path(slug);
```

Trong phạm vi CMS, logic này vừa tránh lỗi parser vừa loại bỏ dấu hiệu traversal bằng `..`. Đây không phải giải pháp kiểm tra đường dẫn tổng quát cho mọi hệ thống máy chủ; đầu vào vẫn cần được xử lý phù hợp khi dùng ở lớp API.

Sau commit, [Bug Checker run #40877387756](https://github.com/duynguyenaver/blognaver/actions/runs/40877387756) **thành công**, và PR #41 được merge vào `main`.

Bộ bằng chứng bao gồm failed run, commit đổi mã và successful run trên SHA mới. Chúng xác nhận **bản sửa đã vượt các bài kiểm tra hiện hành**. Chúng không tự chứng minh toàn bộ giao diện CMS không còn lỗi hành vi.

## 5. Knowledge Base đóng vai trò gì?

BlogNaver có quy tắc `javascript` trong [`data/ci/bug-knowledge.json`](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json). Mẫu nhận diện bao gồm `SyntaxError:` và tư vấn kiểm tra code bằng `node --check`.

Đó là **công cụ chẩn đoán có cấu trúc**: đọc log, gắn nhóm lỗi, đưa ra hướng điều tra. `AGENTS.md` bổ sung quy trình và kinh nghiệm kỹ thuật cho người phát triển hoặc coding agent. Cả hai không đồng nghĩa với một AI luôn có thể tự viết và kiểm tra bản vá mới.

Cơ chế Auto Fixer giới hạn của BlogNaver có thể xử lý một số xung đột merge đã được định nghĩa trước. Lỗi cú pháp JavaScript trong PR #41 không thuộc nhóm sửa tự động an toàn đó.

## 6. Bài học áp dụng lại cho các PR sau

**Thứ nhất:** Với lỗi parser, kiểm tra cú pháp trước build toàn site. Một lần `node --check static/cms/app.js` có thể rút ngắn vòng phản hồi.

**Thứ hai:** Nếu log cho thấy lỗi deterministic, retry nguyên revision không giải quyết được vấn đề. Workflow nên dừng sớm và nêu rõ bước cần sửa.

**Thứ ba:** Mỗi lần CI đổi trạng thái nên được gắn với commit SHA. Chỉ so sánh run trên revision cũ và mới mới cho thấy có thay đổi mã giữa hai lượt kiểm tra.

**Thứ tư:** Bài học nên được lưu hai nơi: Knowledge Base để chẩn đoán tự động, và bài viết có ngữ cảnh để người khác hiểu vì sao lỗi xuất hiện.

**Thứ năm:** Chỉ coi tính năng hoàn tất sau khi đối chiếu cả deployment và hành vi thật; CI xanh chứng minh phạm vi kiểm tra CI, không chứng minh mọi tương tác người dùng.

## 7. Kết luận

PR #41 là ví dụ rất rõ cho triết lý **“phát hiện đúng, sửa có bằng chứng, học từ sự cố”**. Bug Checker đã chặn một bản JavaScript sai cú pháp trước khi merge. Sau khi source được chỉnh, CI mới thành công.

Bài viết đầu tiên trong series **Fix Bug 2026** được xuất bản để chia sẻ chính kinh nghiệm ấy, thay vì tô vẽ thành một ca “AI tự chữa lỗi”. Các kỳ tiếp theo sẽ được tạo khi một PR thực sự có lịch sử thất bại và phục hồi có đủ bằng chứng kiểm chứng.

---

### Nguồn kiểm chứng

- [PR #41 – thay đổi CMS và lịch sử commits](https://github.com/duynguyenaver/blognaver/pull/41).
- [Bug Checker failed #40876960699](https://github.com/duynguyenaver/blognaver/actions/runs/40876960699).
- [Bug Checker passed #40877387756](https://github.com/duynguyenaver/blognaver/actions/runs/40877387756).
- [Commit sửa lỗi d3c7c817](https://github.com/duynguyenaver/blognaver/commit/d3c7c817f873432f4524358c1283ae42e3a2d393).
- [Knowledge Base](https://github.com/duynguyenaver/blognaver/blob/main/data/ci/bug-knowledge.json).

*Phân tích dựa trên log và lịch sử mã thực tế; không phải báo cáo rằng cơ chế tự sửa source đã hoạt động đối với PR #41.*
