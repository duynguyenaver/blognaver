---
title: "TechTalk #01: Code dashboard Chi phí tháng từ Google Sheets — bài toán đồng bộ, mã hóa và Cash Flow"
date: "2026-11-01T22:30:00+07:00"
draft: false
slug: "techtalk-code-dashboard-chi-phi-thang-google-sheets"
description: "Nhật ký xây dựng Chi phí tháng cho BlogNaver: thiết kế Google Sheets, Apps Script, AES-256-GCM, GitHub Actions, Cash Flow và cách truy lỗi đồng bộ khi sửa phương thức thanh toán."
categories: ["Công nghệ", "TechTalk"]
tags: ["series", "TechTalk", "BlogNaver", "Google Sheets", "Google Apps Script", "Python", "GitHub Actions", "AES-256-GCM", "Cash Flow", "Frontend", "Debugging"]
series: ["techtalk"]
seriesOrder: 1
author: "Duy Nguyen"
showTableOfContents: true
showReadingTime: true
showWordCount: true
---

*TechTalk · Kỳ 01 · Nhật ký kỹ thuật dựa trên mã nguồn BlogNaver ngày 01/11/2026.*

Một thay đổi nhỏ trong bảng tính có thể trở thành một bài toán phần mềm lớn đến không ngờ. Tôi mở Google Sheets, sửa **phương thức thanh toán** của một khoản chi đã nhập, rồi quay lại dashboard trên BlogNaver. Dòng dữ liệu trên web vẫn chưa đổi. Trải nghiệm ấy nhắc tôi rằng việc dựng một giao diện đẹp và việc bảo đảm toàn bộ hệ thống đồng bộ đúng là hai công việc hoàn toàn khác nhau.

Đó cũng là câu chuyện của tiện ích [Chi phí tháng & Cash Flow](/blognaver/tien-ich/chi-phi-thang/): một công cụ đưa các khoản thu, chi, ngân sách từ Google Sheets vào báo cáo tài chính cá nhân, nhưng không biến dữ liệu riêng tư thành một tệp JSON công khai.

## 1. Bắt đầu từ vấn đề: Tôi không muốn nhập tiền hai lần

Tôi đã có một bảng tính để ghi nhận chi tiêu. Nếu xây thêm website rồi buộc nhập lại giao dịch bằng biểu mẫu, công cụ mới chỉ tạo ra thêm việc. Vì thế yêu cầu đầu tiên không phải là biểu đồ hay màu sắc: **Google Sheets phải là nguồn dữ liệu gốc**; website đảm nhiệm vai trò đọc, tổng hợp và trình bày.

Thiết kế nguồn dữ liệu có hai tab. Tab `chiphithang` chứa tám cột: Ngày, Loại, Danh mục, Nội dung, Số tiền (VND), Phương thức, Ghi chú và Mã giao dịch. Tab `ngansach` chứa Tháng, Ngân sách (VND) và Ghi chú. Tách hai bảng giúp giao dịch không lẫn với hạn mức, đồng thời tránh suy luận ngân sách từ số tiền đã chi.

Tại bước nhập dữ liệu, script Python kiểm tra tên cột, định dạng ngày, giá trị `Thu`/`Chi`, số tiền hợp lệ và ID trùng. Bản ghi sai không được âm thầm biến thành dữ liệu báo cáo. Thà giữ snapshot cũ còn hơn đưa một bảng sai cấu trúc lên màn hình tài chính.

## 2. Kiến trúc: Không phải Google Sheets → public JSON

BlogNaver dùng Hugo và GitHub Pages — tức là website tĩnh, không có backend riêng để cất bí mật trong mỗi yêu cầu trình duyệt. Trong khi đó, bảng thu chi là dữ liệu cá nhân. Công bố thẳng Sheet bằng CSV công khai sẽ giải quyết bài toán đồng bộ nhưng tạo ra một bài toán khác nghiêm trọng hơn: quyền riêng tư.

Tôi chọn đường đi gồm các lớp có trách nhiệm rõ ràng:

```text
Google Sheets riêng tư (chiphithang, ngansach)
              │
              ▼
Google Apps Script chạy bằng quyền chủ Sheet
              │ HTTPS POST + token xác thực
              ▼
GitHub Actions → Python kiểm tra schema
              │
              ▼
PBKDF2-SHA256 → AES-256-GCM
              │ chỉ commit dữ liệu đã mã hóa
              ▼
Nhánh dữ liệu → Pull Request → CI → Merge
              │
              ▼
GitHub Pages → WebCrypto giải mã trong trình duyệt
              │
              ▼
Dashboard Cash Flow, ngân sách, giao dịch, CSV
```

Ở phía Google, `docs/google-apps-script/MonthlyExpenses.gs` đọc hai tab bằng `getDisplayValues()` sau khi xác thực token qua yêu cầu POST. Phần đọc này chạy dưới quyền chủ sở hữu Sheet. Ở phía GitHub, `scripts/sync-monthly-expenses.py` xác minh dữ liệu và tạo bản mã. Trình duyệt chỉ tải tệp `data.enc.json` đã xuất bản.

Hai bí mật có nhiệm vụ khác nhau: **token của Apps Script** để xác thực máy đọc bảng và **mật khẩu mã hóa** để mở dashboard. Không được lấy token truy cập làm mật khẩu dữ liệu. Đây là điều chỉnh kiến trúc quan trọng so với hướng dùng service account ở giai đoạn đầu.

Cần diễn đạt đúng mô hình bảo vệ: dữ liệu rõ vẫn tồn tại trong Google Sheets và được xử lý tạm thời trong Apps Script/GitHub Actions. Điều được bảo đảm ở thiết kế này là **không đưa giao dịch rõ vào kho GitHub công khai**; đây không phải mô hình mã hóa đầu-cuối loại bỏ mọi máy chủ trung gian.

## 3. Cách tôi giải quyết bài toán “dữ liệu có thật sự thay đổi?”

Mã hóa AES-GCM tạo `salt` và `nonce` ngẫu nhiên. Do đó, cùng một bảng thu chi nếu mã hóa hai lần vẫn tạo hai bản mã khác nhau. Nếu so sánh trực tiếp ciphertext, hệ thống sẽ hiểu nhầm là Sheets luôn đổi, liên tục sinh PR vô ích.

Giải pháp trong importer là chuẩn hóa dữ liệu thành JSON có thứ tự khóa ổn định, rồi tính SHA-256 trên toàn bộ đối tượng giao dịch và ngân sách:

```python
def canonical(value):
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":")
    ).encode()

fingerprint = hashlib.sha256(canonical(data)).hexdigest()
```

Chỉ khi `sourceHash` khác bản đang có, script mới tạo snapshot mã hóa mới. Quan trọng hơn, trường `method` — tức **phương thức thanh toán** — nằm trong từng giao dịch được đưa vào `canonical(data)`. Về mặt thuật toán, chỉ sửa “Tiền mặt” thành “Chuyển khoản” cũng phải tạo fingerprint mới, ngay cả khi số tiền, ngày và danh mục giữ nguyên.

Điều này khiến lỗi “sửa phương thức nhưng web chưa cập nhật” trở thành một tình huống debug thú vị: nó **không đủ để kết luận** thuật toán hash đã bỏ quên cột Phương thức. Cần xác định dữ liệu mới đã đi được tới đâu trong pipeline.

## 4. Đường đi của một lần chỉnh sửa và các điểm có thể nghẽn

Google Apps Script có hàm `monthlyExpensesOnEdit`, theo dõi cả tab `chiphithang` lẫn `ngansach`. Nếu cài trigger và có `GITHUB_DISPATCH_TOKEN`, script gọi GitHub Actions ngay khi có chỉnh sửa phù hợp. Để tránh spam workflow, script giới hạn lệnh dispatch trong khoảng 60 giây. Không cài trigger vẫn có lịch đồng bộ định kỳ khoảng 15 phút; lịch GitHub có thể chạy trễ.

Nhưng **kích hoạt workflow không đồng nghĩa website lập tức có dữ liệu mới**. Sau khi Actions đọc Sheet còn phải qua kiểm tra, tạo PR dữ liệu, CI, merge và deploy GitHub Pages. Nút “Kiểm tra cập nhật” của dashboard chỉ tải bản mã **đã xuất bản**; nó không có quyền truy cập trực tiếp Google Sheets riêng tư.

Khi gặp lỗi hiển thị cột Phương thức, tôi sẽ truy vết theo thứ tự sau:

1. Xác nhận ô đã lưu ở đúng tab, đúng cột F và Apps Script đọc được giá trị mới.
2. Kiểm tra trigger hoặc lần chạy định kỳ của workflow; nếu chưa có run mới, sự cố ở trước bước nhập dữ liệu.
3. Đọc log importer: có lỗi quyền, header, token, dữ liệu không hợp lệ hay thông báo `Source unchanged` không?
4. So sánh `sourceHash` của snapshot trước và sau. Nếu hash không đổi dù Sheet đã đổi, kiểm tra đầu vào Apps Script và bộ parser; nếu hash đổi, kiểm tra PR/CI/merge.
5. Chỉ sau khi Pages deploy, tải lại dashboard để xác minh cột Phương thức hiển thị đúng.

Đây là **quy trình chẩn đoán**, không phải tuyên bố sự cố đã được sửa. Muốn kết luận nguyên nhân gốc phải đối chiếu run log và bản triển khai tại thời điểm lỗi.

## 5. Từ dữ liệu thô đến giao diện Cash Flow

Khi người dùng nhập mật khẩu, `static/tien-ich/chi-phi-thang/app.js` dùng WebCrypto: PBKDF2-SHA256 suy ra khóa AES-256-GCM, giải mã dữ liệu, kiểm tra cấu trúc rồi mới hiển thị dashboard. Mật khẩu có thể được ghi nhớ **khi chủ thiết bị đồng ý** thông qua vault của trình duyệt; luôn có thao tác khóa và quên mật khẩu.

Phần đáng giá của dashboard không phải chỉ là tổng chi. Tôi cần nhìn thấy bức tranh tiền bạc trong từng tháng:

- **Tổng thu, tổng chi, dòng tiền ròng:** phép tính từ các giao dịch đã giải mã, không phải số liệu AI dự đoán.
- **Ngân sách còn lại:** hạn mức được khai báo riêng, giúp phát hiện chi vượt kế hoạch.
- **Dòng tiền tích lũy và xu hướng sáu tháng:** cho thấy biến động theo thời gian.
- **Sổ giao dịch:** có tìm kiếm, lọc loại, phân trang và hiển thị phương thức thanh toán.
- **Xuất CSV:** phục vụ kiểm tra bằng bảng tính khi cần.

Tôi cũng tách phần phân tích tài chính thành mã riêng (`finance-report.js`) thay vì nhồi toàn bộ tính toán và giao diện vào một tệp. Sự phân lớp này giúp kiểm thử các phép tính mà không phải thao tác qua mọi nút bấm của trang.

## 6. Những quyết định nhỏ nhưng có hậu quả lớn

**Thất bại phải an toàn.** Nếu tên cột bị sửa, ngày không hợp lệ hoặc Apps Script trả lỗi xác thực, workflow phải dừng. Không được thay bản mã hợp lệ bằng một snapshot rỗng rồi báo “đã đồng bộ”.

**Tránh PR trùng vì bản mã ngẫu nhiên.** `sourceHash` giúp nhận diện nội dung gốc. Bộ Finance Conflict Resolver còn kiểm tra bản trên `main`, PR đang mở và xung đột ở nhánh dữ liệu. Khi thay snapshot phải thay **trọn gói bản mã**, không ghép riêng `nonce` của PR này với `ciphertext` của PR khác.

**Tránh cảm giác realtime giả.** Web có thể đọc lại bản đã deploy bằng `cache: "no-store"`, nhưng không thể rút ngắn các giai đoạn chưa chạy xong. Nhãn trạng thái nên phản ánh đúng bản cuối cùng mà người dùng thực sự nhìn thấy.

**Đừng lấy CI xanh làm bằng chứng tài chính đúng.** Build pass kiểm tra cú pháp, schema và một số phép tính; không thay thế việc đối chiếu một giao dịch cụ thể giữa Sheet và giao diện sau deploy.

## 7. Bài học sau khi code tiện ích đầu tiên

Bài học lớn nhất là: **độ tin cậy của dashboard được quyết định ở ranh giới giữa các hệ thống**, chứ không chỉ trong JavaScript dựng biểu đồ. Một cột nhỏ như “Phương thức thanh toán” buộc ta phải kiểm tra nguồn Sheet, trigger, parser, fingerprint, quyền Actions, PR, CI, Pages và cache trình duyệt.

Khi xây một công cụ cho chính mình, việc nhìn thấy lỗi ở dữ liệu thật là cơ hội bổ sung test hồi quy có ý nghĩa hơn hàng chục hiệu ứng giao diện. Dashboard tốt không chỉ đẹp khi dữ liệu đúng; nó còn phải nói rõ **lần đồng bộ nào thành công, dữ liệu có mới không, và khi sai thì nên kiểm tra ở đâu**.

**Bạn sẽ chọn đồng bộ trực tiếp để nhanh hơn, hay chấp nhận pipeline có PR và mã hóa để đổi lấy khả năng kiểm tra và riêng tư?** Với Chi phí tháng, tôi chọn phương án thứ hai — đồng thời tiếp tục tối ưu cách phát hiện thay đổi để người dùng không phải phỏng đoán.

---

**Mã nguồn và lịch sử triển khai:** [Ứng dụng Chi phí tháng](https://github.com/duynguyenaver/blognaver/tree/main/static/tien-ich/chi-phi-thang) · [Importer Python](https://github.com/duynguyenaver/blognaver/blob/main/scripts/sync-monthly-expenses.py) · [Apps Script](https://github.com/duynguyenaver/blognaver/blob/main/docs/google-apps-script/MonthlyExpenses.gs) · [PR #354 — tính năng gốc](https://github.com/duynguyenaver/blognaver/pull/354) · [PR #355 — chuyển sang Apps Script](https://github.com/duynguyenaver/blognaver/pull/355).