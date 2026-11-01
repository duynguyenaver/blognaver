---
title: "TechTalk #02: Code Language Lab Việt–Hàn–Anh — Google Sheets, Gemini/Groq và flashcard"
date: "2026-11-01T22:35:00+07:00"
draft: false
slug: "techtalk-code-language-lab-viet-han-anh-gemini-groq"
description: "Hậu trường viết Language Lab cho BlogNaver: đồng bộ Google Sheets 30 giây, Gemini/Groq bổ sung ngữ cảnh và ngữ pháp, ghi ngược D–E, flashcard và những bug từ AI quota đến dữ liệu chờ."
categories: ["Công nghệ", "TechTalk"]
tags: ["series", "TechTalk", "BlogNaver", "Google Sheets", "Google Drive", "Gemini", "Groq", "Python", "JavaScript", "Flashcard", "GitHub Actions", "UI UX"]
series: ["techtalk"]
seriesOrder: 2
author: "Duy Nguyen"
showTableOfContents: true
showReadingTime: true
showWordCount: true
---

*TechTalk · Kỳ 02 · Nhật ký kỹ thuật dựa trên mã nguồn BlogNaver ngày 01/11/2026.*

Một danh sách từ vựng chỉ có ba cột **Việt – Hàn – Anh** trông rất gọn gàng trong Google Sheets. Nhưng khi học thật, tôi sớm gặp câu hỏi quan trọng hơn: cùng một từ, đặt vào câu nào thì tự nhiên, lúc nào mang nghĩa khác, và cấu trúc ngữ pháp đi cùng là gì?

Từ nhu cầu đó, tôi phát triển [Học tiếng Việt · Hàn · Anh](/blognaver/tien-ich/hoc-tieng-viet-han-anh/) — một Language Lab có kho từ, tra cứu, giải thích theo ngữ cảnh, ví dụ và flashcard. Bài toán code không dừng ở việc đọc bảng tính. Tôi phải làm cho dữ liệu người dùng nhập xuất hiện nhanh, cho AI làm việc riêng, và không để một lần Gemini hết quota làm cả trang học tập tê liệt.

## 1. Quy tắc dữ liệu đầu tiên: Người học quyết định từ gốc, AI chỉ bổ sung

Bảng nguồn có năm cột: **A: Việt, B: Hàn, C: Anh, D: Ngữ cảnh sử dụng, E: Ngữ pháp/ví dụ**. Tôi chỉ cần nhập A–C. Phần D–E dành cho nội dung bổ sung từ AI hoặc cho ghi chú do chính người học viết.

Có một ranh giới không được phá: AI không tự ý sửa ba cột dịch gốc. Từ “nghiêm túc” khi đi qua nhiều ngôn ngữ có thể gặp những tương đương không hoàn toàn trùng sắc thái. Tự động ghi đè bản dịch chỉ vì mô hình “nghĩ” một đáp án khác đúng hơn sẽ khiến dữ liệu nguồn biến thành thứ khó kiểm soát.

Vì vậy pipeline giữ nguyên A–C, nhận diện thay đổi để làm mới phần giải thích khi cần, đồng thời **không ghi đè D–E nếu hai ô đó đã có nội dung do người dùng nhập**. Kiến trúc ưu tiên bảo toàn dữ liệu hơn là cố tạo ra cảm giác AI luôn đúng.

## 2. Tại sao tôi tách đồng bộ thành hai đường?

Ban đầu tôi có thể chọn một lối rất đơn giản: vài phút chạy GitHub Actions một lần, tạo `vocabulary.json`, rồi để website đọc bản JSON đó. Cách làm này ổn cho một kho từ ít thay đổi, nhưng không phù hợp khi vừa gõ thêm từ ở Sheet và muốn nhìn thấy ngay trên trang.

Giải pháp là hai tốc độ đồng bộ cùng tồn tại:

```text
       Google Sheet: Việt | Hàn | Anh | Ngữ cảnh | Ngữ pháp
              │                         │
    ┌─────────┘                         └───────────────┐
    ▼                                                 ▼
Browser đọc Google Visualization                   GitHub Actions
mỗi 30 giây khi trang đang mở                     (lịch / dispatch)
    │                                                 │
    ▼                                                 ▼
A–C mới hiển thị nhanh                   Python kiểm tra + cache
    │                                                 │
    │                                      Gemini → Groq nếu cần
    │                                                 │
    │                                       Data PR → CI → Pages
    │                                                 │
    └──────────────── Merge ───────────────────────────┘
                       │
               Tra cứu + flashcard
                       │
              Apps Script kiểm tra D–E
            và chỉ điền vào ô còn trống
```

Đường **trực tiếp** nằm trong `live-sheet.js`: trình duyệt đọc Google Visualization của bảng có quyền Viewer, đặt timeout 12 giây và kiểm tra phản hồi. `study.js` cập nhật khi mở trang, bấm tải lại, quay lại tab và theo chu kỳ 30 giây khi tab đang hiển thị. Nhờ thế từ mới A–C không phải chờ một bản deploy.

Đường **làm giàu nội dung** chạy trên GitHub Actions. Script Python đọc các bảng được cho phép trong thư mục Google Drive (khi có quyền dịch vụ), chuẩn hóa dữ liệu, dùng cache cho từ chưa đổi, thử tạo giải thích và xuất bản snapshot qua PR → CI → GitHub Pages. Lịch workflow hiện cấu hình tối thiểu khoảng 5 phút; lịch thực tế có thể trễ.

Điểm cần nói rõ: cập nhật A–C nhanh **không có nghĩa** ngữ cảnh AI xuất hiện sau đúng 30 giây. Đó là hai hệ thống có điều kiện hoàn thành khác nhau.

## 3. Mỗi dòng từ vựng phải có danh tính ổn định

Khi gom nhiều Sheet hoặc nhiều tab, không thể lấy riêng từ tiếng Việt làm khóa. Cùng một từ có thể có hai cách dịch, hoặc được nhập ở hai nguồn khác nhau. Trong `sync-trilingual-vocabulary.py`, mã định danh được rút từ `spreadsheet ID / tab ID / số dòng`, còn fingerprint nội dung được tính từ chính A–C và dữ liệu đầu vào liên quan.

Về nguyên tắc, logic đó trả lời hai câu hỏi khác nhau:

- **Đây là dòng nào?** Dùng định danh nguồn để theo dõi bản ghi.
- **Nội dung dòng ấy có đổi không?** Dùng hash nội dung để quyết định cache giải thích còn phù hợp hay không.

Tách danh tính khỏi nội dung giúp giảm việc gọi AI lặp lại. Nhưng cũng phải thừa nhận một giới hạn: nếu người dùng sắp xếp, chèn hoặc xóa hàng, vị trí dòng có thể đổi. Vì vậy khi cần hệ thống ở quy mô lớn, ID bất biến do Sheet cấp sẽ vững hơn cách gắn ID với số dòng. Đó là bài học về mô hình dữ liệu, không phải một tính năng tôi muốn quảng cáo quá khả năng hiện tại.

## 4. Tích hợp Gemini không chỉ là gửi một prompt

Mục tiêu của tôi không phải sinh thật nhiều văn bản, mà là nhận được một câu trả lời **có thể dùng để học**: ngữ cảnh, ghi chú ngữ pháp và ví dụ tương ứng ở cả ba ngôn ngữ.

Importer có cơ chế lấy danh sách model Gemini hỗ trợ tạo văn bản thay vì đóng cứng vào một tên model có thể bị khai tử. Nó thử những model đủ điều kiện theo thứ tự ưu tiên, giới hạn số lần thử và có khả năng xử lý những lỗi như HTTP 404 hoặc 429. Khi Gemini không đáp ứng được, pipeline có thể chuyển sang **Groq** với danh sách text model khả dụng riêng.

Tại sao việc chuyển nhà cung cấp là một tính năng quan trọng? Vì “API còn sống” khác với “tài khoản này còn quota”; một model trả HTTP 429 không chứng minh mọi model, mọi provider đều đã hết hạn mức. Tuy nhiên, fallback **không tạo ra quota vô hạn**: cả hai dịch vụ có thể cùng thất bại. Khi đó từ gốc phải còn, còn trạng thái nội dung bổ sung phải thể hiện là đang chờ.

Một chi tiết nữa là **bằng chứng nguồn**. Kết quả Gemini có Google Search grounding và liên kết tham khảo có thể được lưu lại nếu thực sự được cung cấp. Kết quả Groq không được mạo nhận là đã kiểm chứng bằng Google Search; metadata `aiProvider`, `grounded` và `references` phải phản ánh đúng cách tạo nội dung.

## 5. Một bug khó chịu: Code deploy xanh nhưng từ vẫn “ĐANG CHỜ AI”

Trong quá trình phát triển, tôi gặp khoảng cách giữa hai thứ thường bị nhầm lẫn: **workflow chạy thành công** và **AI đã thật sự sinh được ghi chú hữu ích**. Một bản Pages deploy có thể xanh trong khi Gemini bị giới hạn, JSON chưa được tạo mới hoặc dữ liệu đang chờ chưa được giải quyết.

Phần này buộc tôi bổ sung suy nghĩ theo từng trạng thái thay vì một nhãn “thành công” duy nhất:

- **Nguồn đã đọc:** Google Sheets A–C tải được.
- **AI đang chờ:** Chưa có ngữ cảnh hoặc ngữ pháp hợp lệ.
- **AI đã tạo:** Có đủ trường cần thiết, xác định rõ Gemini hay Groq.
- **Snapshot đã xuất bản:** PR dữ liệu đã qua CI, merge và deploy.
- **D–E đã ghi ngược:** Apps Script hoặc tài khoản được cấp quyền xác nhận điền vào các ô trống.

Frontend cũng có một lớp lỗi tinh vi. Nếu `study.js` chỉ tải `vocabulary.json` lúc mở trang rồi cứ ưu tiên cache cũ, người dùng đang để tab mở có thể mãi nhìn thấy “ĐANG CHỜ AI” ngay cả khi Actions đã cập nhật phần giải thích. Vì vậy vòng refresh hiện đọc lại cả snapshot đã deploy và dữ liệu A–E đang live, sau đó gộp theo danh tính nguồn. Một snapshot cũ không được phép che lấp ghi chú mới, và mẫu offline cũ không được đánh tráo thành câu trả lời Gemini/Groq đã xác thực.

Đây là bài học thực tế về **cache invalidation**: tải lại nhiều lần không có ích nếu ta luôn ghép dữ liệu theo thứ tự ưu tiên sai.

## 6. Ghi ngược D–E: Quyền chỉnh sửa có giới hạn

Đọc Google Sheets trên web bằng quyền Viewer khác hoàn toàn với việc **ghi** vào bảng. Nếu cấp “Anyone with link → Editor” để tiện tự động điền, người lạ cũng có thể thay nội dung. Tôi không muốn đánh đổi cả thư viện từ vựng chỉ để tiết kiệm một bước xác thực.

Thiết kế hỗ trợ Google Apps Script chạy bằng quyền chủ bảng, hoặc service account được cấp quyền giới hạn. Sau khi phần giải thích AI hoàn chỉnh được xuất bản, tiến trình ghi ngược kiểm tra header, đối chiếu chính xác A–C ở dòng nguồn rồi **chỉ lấp D–E đang trống**. Nếu người học đã tự viết ngữ cảnh, hệ thống phải tôn trọng phần ấy.

Cũng có một chi tiết vận hành quan trọng: việc sửa `LanguageLab.gs` trong GitHub không tự thay mã đang cài trong Google Apps Script của người dùng. Script cài riêng phải được cập nhật và trigger phải được cấu hình theo hướng dẫn. Một commit thành công không tự động nâng cấp mọi thành phần bên ngoài repository.

## 7. Làm UI như Excel, nhưng không biến thành một bảng tính thứ hai

Tôi muốn trang học nhìn giống một không gian làm việc quen thuộc. Vì thế giao diện được chuyển sang màu **xanh Excel**, với các sắc độ xanh đậm, xanh nhấn và bề mặt sáng. Lần chỉnh màu được giới hạn ở CSS: không sửa logic tìm kiếm, AI, Sheets hay flashcard chỉ để đổi branding.

Danh sách từ mới nhất đứng trước và **ba mục mỗi trang** để giảm cảm giác ngợp. Người học có thể tìm từ, lọc, mở phần giải thích theo nhu cầu và bấm flashcard để đoán nghĩa. Nút nghe sử dụng chức năng phát âm của trình duyệt; chất lượng giọng đọc còn phụ thuộc ngôn ngữ và voice có sẵn trên thiết bị.

Một thay đổi nhỏ mà tôi rất thích là dùng biểu tượng hoa thay cho cờ quốc gia: 🌼 cho tiếng Việt, 🌺 cho tiếng Hàn và 🌸 cho tiếng Anh theo lựa chọn thiết kế của trang. Đây là biểu tượng giao diện, **không phải tuyên bố chính thức về quốc hoa** của từng nước. Phần banner cũng được nới chữ để tránh cảnh khoảng trống thì rộng mà câu mô tả bị xuống dòng không cần thiết.

Tôi học được rằng **UI phải thể hiện đúng độ tin cậy của dữ liệu**. Một badge màu xanh chỉ nên sáng khi giải thích thực sự có nội dung hợp lệ, không phải vì hàm fetch vừa trả HTTP 200.

## 8. Những gì tôi muốn kiểm thử trước khi gọi là “hoàn thiện”

Bộ kiểm thử của tiện ích đã bao phủ parsing ba ngôn ngữ, ID nguồn, định dạng phản hồi, fallback model, sắp xếp từ mới, phân trang ba mục và cú pháp JavaScript. Nhưng kiểm thử tự động vẫn cần được bổ sung bằng kịch bản thực tế: nhập một từ mới, sửa một nghĩa, điền sẵn D–E, hết quota Gemini, đổi sang Groq, reload trang khi workflow đang chạy và so sánh kết quả sau khi Pages triển khai.

Tôi cũng phân biệt rõ **dữ liệu public và dữ liệu private**. Snapshot từ vựng này được xuất thành JSON công khai để người đọc có thể học; nó không dành cho thuật ngữ mật, tài liệu khách hàng hoặc thông tin cá nhân nhạy cảm. Cơ chế mã hóa của tiện ích Chi phí tháng **không tự động áp dụng** cho Language Lab.

## 9. Điều tôi mang theo sau dự án Language Lab

Code một công cụ từ vựng tưởng đơn giản hóa ra là thiết kế **nguồn dữ liệu, quyền truy cập, trạng thái AI, bộ nhớ đệm, trải nghiệm học và phương án chịu lỗi** cùng lúc. Với tôi, điều thành công nhất không phải là có thể gọi Gemini hay Groq từ GitHub Actions. Đó là sự phân định: từ gốc có thể xuất hiện ngay, AI có thể đến sau, bản dịch của người học không bị tự ý sửa, và mọi nội dung bổ sung đều có trạng thái nguồn gốc.

**Một ứng dụng học ngôn ngữ nên ưu tiên số lượng ví dụ AI sinh ra, hay khả năng kiểm tra từng ví dụ trước khi tin?** Tôi nghiêng về phương án thứ hai. Tự động hóa khiến việc học đều đặn dễ hơn; chất lượng ngôn ngữ vẫn cần một người học tỉnh táo ở cuối vòng lặp.

---

**Mã nguồn và hành trình phát triển:** [Language Lab](https://github.com/duynguyenaver/blognaver/tree/main/static/tien-ich/hoc-tieng-viet-han-anh) · [Importer và AI fallback](https://github.com/duynguyenaver/blognaver/blob/main/scripts/sync-trilingual-vocabulary.py) · [Google Apps Script](https://github.com/duynguyenaver/blognaver/blob/main/docs/google-apps-script/LanguageLab.gs) · [PR #320 — tính năng gốc](https://github.com/duynguyenaver/blognaver/pull/320) · [PR #328 — thư viện từ mới](https://github.com/duynguyenaver/blognaver/pull/328) · [PR #341 — lỗi quyền tạo PR](https://github.com/duynguyenaver/blognaver/pull/341).