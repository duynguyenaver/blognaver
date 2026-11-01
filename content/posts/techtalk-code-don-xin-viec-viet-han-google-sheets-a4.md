---
title: "TechTalk #03: Code Đơn xin việc Việt–Hàn — Google Sheets, mã hóa AES và PDF A4"
date: "2026-11-02T01:00:00+07:00"
draft: false
slug: "techtalk-code-don-xin-viec-viet-han-google-sheets-a4"
description: "Nhật ký xây dựng Đơn xin việc song ngữ trên BlogNaver: 8 tab Google Sheets, Service Account, AES-256-GCM, Pull Request tự động và mẫu in 4 trang A4."
categories: ["Công nghệ", "TechTalk"]
tags: ["series", "TechTalk", "BlogNaver", "Đơn xin việc", "CV", "Việt Hàn", "Google Sheets", "Service Account", "Python", "JavaScript", "GitHub Actions", "AES-256-GCM", "PDF", "UI UX"]
series: ["techtalk"]
seriesOrder: 3
author: "Duy Nguyen"
showTableOfContents: true
showReadingTime: true
showWordCount: true
---

*TechTalk · Kỳ 03 · Nhật ký kỹ thuật dựa trên mã nguồn BlogNaver ngày 02/11/2026.*

Một bản đơn xin việc có thể trông rất chỉn chu trên giấy, nhưng để mỗi lần cập nhật kinh nghiệm làm việc không phải chỉnh lại hàng chục ô, hàng loạt bảng biểu và ngắt trang, tôi cần nhiều hơn một mẫu Word đẹp. Tôi muốn **nhập dữ liệu ở một nơi, mở website để xem thành một bộ hồ sơ có thể in**, và quan trọng nhất: không vô tình đưa số điện thoại, ngày sinh hay địa chỉ lên một repository công khai.

Đó là lý do tôi xây [Đơn xin việc / 입사지원서](/blognaver/tien-ich/don-xin-viec/) cho BlogNaver. Công cụ dùng Google Sheets làm nguồn dữ liệu, GitHub Actions để đồng bộ, mã hóa AES-256-GCM để bảo vệ bản xuất bản và giao diện song ngữ Việt–Hàn có thiết kế in A4 lấy cảm hứng từ biểu mẫu ứng tuyển Samsung.

## 1. Bài toán thật sự không phải là vẽ một biểu mẫu

Điền CV một lần tương đối dễ. Vấn đề bắt đầu khi muốn sửa tên chức vụ, thêm chứng chỉ, cập nhật điểm ngoại ngữ hoặc viết dài hơn phần thành tựu. Nếu thông tin nằm rải rác trong nhiều file, mỗi thay đổi kéo theo một vòng sao chép và căn chỉnh.

Tôi đặt ra ba nguyên tắc cho tính năng mới:

1. **Google Sheets là nguồn duy nhất:** cập nhật hồ sơ tại bảng tính; website không giữ một bản nhập liệu riêng dễ lệch nội dung.
2. **Giao diện là một tài liệu để đọc và in:** không biến màn hình thành hàng trăm trường form; người dùng nhìn thấy ngay kết quả A4.
3. **Không công khai dữ liệu rõ:** GitHub Pages là website tĩnh, vì thế bản được phát hành phải được mã hóa trước khi vào repository.

Sự phân tách này cho phép bảng tính làm tốt việc quản lý dữ liệu, còn trình duyệt làm tốt việc trình bày.

## 2. Từ mẫu tuyển dụng Hàn Quốc đến bốn trang A4

Bộ hồ sơ được thiết kế dựa trên **bố cục các trang 2–5** của một PDF mẫu ứng tuyển Samsung; trang thỏa thuận dữ liệu cá nhân đầu tiên không được đưa vào. Tôi giữ đặc trưng bảng biểu nền xám, điểm nhấn cyan và nhãn tiếng Hàn, đồng thời thêm diễn giải tiếng Việt ở các khu vực quan trọng.

Cấu trúc in được chia thành bốn phần:

- **Trang 1 — 인적사항, 학력사항, 경력사항:** thông tin cá nhân, học vấn, kinh nghiệm, chứng chỉ, ngoại ngữ và các thông tin đặc thù.
- **Trang 2 — 연구경력, 논문/특허/수상내역:** nghiên cứu, công trình, bằng sáng chế và giải thưởng; hữu ích nếu ứng tuyển vị trí kỹ thuật hoặc nghiên cứu.
- **Trang 3 — 경력 사항 기술:** đi sâu vào từng nơi làm việc, trách nhiệm chính và thành tựu thay vì chỉ viết một dòng chức danh.
- **Trang 4 — 추가 기재 사항:** giới thiệu bản thân, mục tiêu nghề nghiệp và nội dung bổ sung tự do.

Tôi cố ý phân biệt **"lấy cảm hứng từ"** với **"biểu mẫu chính thức"**. Đây là một mẫu tham khảo theo phong cách Samsung, không phải mẫu được Samsung chứng thực hay cam kết phù hợp với mọi đợt tuyển dụng.

## 3. Tám tab Google Sheets để không phải nhồi mọi thứ vào một ô

Trong bảng nguồn, dữ liệu được chia thành tám tab: \`CV\`, \`HocVan\`, \`KinhNghiem\`, \`ChungChi\`, \`NgoaiNgu\`, \`NghienCuu\`, \`ThanhTuu\` và \`BoSung\`.

Tab \`CV\` dùng cột A làm **nhãn trường cố định** và cột B để nhập giá trị như họ tên, vị trí ứng tuyển, thông tin liên hệ hay mục tiêu nghề nghiệp. Các tab còn lại dùng từng hàng cho một đơn vị dữ liệu: một công ty, một bằng cấp, một chứng chỉ, một đề tài hoặc một thành tựu.

Cách tổ chức này giải quyết hai vấn đề thực tế. Thứ nhất, cùng một dòng kinh nghiệm có thể xuất hiện gọn ở bảng tổng quan trang 1 và chi tiết hơn ở trang 3 mà không cần nhập hai lần. Thứ hai, thêm một bằng cấp hay một công ty mới không đòi hỏi sửa cấu trúc HTML.

Tại lớp Python, \`scripts/sync-don-xin-viec.py\` kiểm tra tên tab, header và nhãn hồ sơ. Nếu ai đó đổi tên cột hoặc xóa một nhãn bắt buộc, importer **dừng đồng bộ và giữ snapshot cũ** thay vì cố đoán cột nào là cột nào. Đây là một quyết định ít hào nhoáng, nhưng có tác dụng lớn với dữ liệu cá nhân.

## 4. Kiến trúc: Google Sheets riêng tư → GitHub Pages, không cần Apps Script

BlogNaver chạy trên Hugo và GitHub Pages, không có backend riêng luôn trực tuyến để bảo quản khóa truy cập Google. Tôi sử dụng **Google Service Account** có quyền đọc Sheet và chỉ cấp cho GitHub Actions quyền lấy dữ liệu qua Google Sheets API.

\`\`\`text
Google Sheets riêng tư — 8 tab hồ sơ
             │
             ▼
GitHub Actions: Google Service Account (read-only)
             │
             ▼
Python kiểm tra nhãn, header và schema
             │
             ▼
Chuẩn hóa JSON → SHA-256 sourceHash
             │ nếu nội dung thật sự thay đổi
             ▼
PBKDF2-SHA256 → AES-256-GCM
             │ chỉ lưu bản mã hóa
             ▼
Feature branch → Pull Request → CI → Merge
             │
             ▼
GitHub Pages: data.enc.json
             │
             ▼
Trình duyệt: WebCrypto giải mã bằng mật khẩu
             │
             ▼
Xem trước / In / Lưu PDF A4
\`\`\`

Workflow \`.github/workflows/don-xin-viec-sync.yml\` có thể chạy thủ công và được đặt lịch **5 phút một lần**. Khi phát hiện dữ liệu mới, nó tạo nhánh và Pull Request thay vì ghi trực tiếp lên \`main\`. Sau khi PR được kiểm tra, merge và site được triển khai, người dùng mới nhận bản mới trên website.

Ở trình duyệt, \`app.js\` kiểm tra lại tệp mã hóa **45 giây một lần khi tab đang mở**, kiểm tra lúc người dùng quay lại tab và có nút "Kiểm tra cập nhật". Vì vậy cần nói chính xác: **45 giây là nhịp kiểm tra bản đã được phát hành, không phải cam kết Google Sheets đồng bộ tức thì**. GitHub Actions theo lịch có thể trễ, và một PR chưa merge sẽ chưa xuất hiện trên trang.

## 5. Bài học về phát hiện thay đổi: đừng so sánh ciphertext

AES-GCM dùng salt và nonce ngẫu nhiên, nên mã hóa cùng một nội dung hai lần vẫn có thể tạo hai tệp mã khác nhau. Nếu chỉ so sánh bản mã, hệ thống có thể nhầm rằng người dùng đã cập nhật CV dù thực tế không sửa gì.

Tôi giải quyết bằng cách biến dữ liệu đã kiểm tra thành một JSON ổn định: thứ tự khóa được chuẩn hóa, khoảng trắng không liên quan được loại bỏ, rồi tính SHA-256. Giá trị này được ghi vào \`sourceHash\`.

\`\`\`python
def canonical(value):
    return json.dumps(
        value, ensure_ascii=False,
        sort_keys=True, separators=(",", ":")
    ).encode("utf-8")

source_hash = hashlib.sha256(canonical(profile_data)).hexdigest()
\`\`\`

Nếu \`sourceHash\` bằng bản hiện tại, script thông báo **không có thay đổi và không tạo PR**. Nếu một trường được ánh xạ — chẳng hạn chức vụ, thời gian công tác, ghi chú hay chứng chỉ — thực sự đổi, hệ thống sinh bản mã mới.

Điểm này đặc biệt quan trọng với một blog đang tự động hóa nhiều tiện ích: tránh PR không cần thiết đồng nghĩa giảm các lần chạy CI, nguy cơ xung đột và cảm giác "đồng bộ mãi không xong". Dĩ nhiên, hash chỉ phát hiện thay đổi ở **dữ liệu được script đọc và ánh xạ**, không phải mọi thay đổi định dạng ô trong Google Sheets.

## 6. Quyền riêng tư: mã hóa trước khi xuất bản

Một website tĩnh không nên đẩy nguyên bản CV lên file \`data.json\` công khai. Trong pipeline hiện tại, Python dùng **AES-256-GCM**, với khóa suy ra từ mật khẩu thông qua **PBKDF2-SHA256, 310.000 vòng**. Dữ liệu được mã hóa trước khi commit; repository chứa \`data.enc.json\`, không chứa các giá trị hồ sơ ở dạng rõ.

Khi mở trang, người dùng nhập mật khẩu; Web Crypto API trên thiết bị thực hiện giải mã rồi JavaScript mới dựng nội dung. Có thể chọn ghi nhớ mật khẩu trên thiết bị cá nhân và có nút **"Khóa & quên mật khẩu"** để xóa mật khẩu đã nhớ và ẩn nội dung đang hiển thị.

Nhưng đây không phải lý do để nói rằng hồ sơ "an toàn tuyệt đối". Google Sheets và tiến trình Actions vẫn xử lý dữ liệu ở dạng rõ trong phạm vi quyền được cấp. Repository công khai vẫn cho phép tải ciphertext để thử đoán mật khẩu ngoại tuyến. Bởi vậy **mật khẩu phải dài, ngẫu nhiên, riêng biệt**; không nên bật ghi nhớ trên máy dùng chung. Mô hình này giảm việc lộ dữ liệu trực tiếp trên GitHub Pages, chứ không thay thế kiểm soát quyền của Google và GitHub.

## 7. Làm frontend phục vụ giấy A4 thay vì chỉ phục vụ màn hình

Giao diện trên web cho phép **"Xem mẫu trắng"** mà không cần hiển thị dữ liệu cá nhân. Sau khi mở khóa thành công, JavaScript đổ thông tin vào các bảng bằng thao tác DOM, ưu tiên \`textContent\` thay vì ghép thẳng dữ liệu người dùng vào HTML. Nhờ vậy nội dung từ Sheet được trình bày như văn bản, không bị diễn giải thành markup tùy ý.

Phần in dùng \`@page { size: A4 portrait; margin: 0 }\`, còn mỗi khu vực \`.paper\` được đặt theo kích thước **210 × 297 mm**. CSS ẩn điều hướng, nút bấm và footer web trong bản in; giữ nền màu bằng \`print-color-adjust\`; đồng thời tránh ngắt trang giữa các thẻ kinh nghiệm hoặc hàng bảng khi có thể.

Nút **"In / Lưu PDF A4"** sử dụng chức năng in của trình duyệt, không yêu cầu một dịch vụ tạo PDF phía máy chủ. Đây là lựa chọn nhẹ và hợp với một static site, nhưng vẫn có giới hạn: nếu một mục kinh nghiệm hoặc phần bổ sung quá dài, trình duyệt có thể tạo thêm trang và kết quả có thể khác nhau theo trình duyệt hoặc thiết lập in. Muốn giữ các mảng cyan và xám nên bật **Background graphics** trong hộp thoại in.

## 8. Những lỗi tôi muốn hệ thống nói rõ thay vì âm thầm thất bại

Với dạng tiện ích này, một dòng trạng thái hữu ích đôi khi quan trọng hơn một hiệu ứng giao diện đẹp.

**Không tải được snapshot:** cần kiểm tra Google Service Account đã được chia sẻ quyền Viewer cho đúng Sheet chưa, GitHub Secrets đã cấu hình chưa và workflow đã từng chạy thành công chưa. Không thể chỉ bấm refresh trên web để thay thế các bước đó.

**Đồng bộ báo lỗi header:** cần sửa lại nhãn hoặc tên cột đúng cấu trúc nguồn. Hệ thống chủ động không ghi đè bản mã cũ khi cấu trúc đầu vào sai.

**Có thay đổi trong Sheet nhưng web chưa đổi:** lần lượt kiểm tra Actions, bản commit mã hóa, PR có merge hay không, deploy GitHub Pages đã xong chưa, rồi mới kiểm tra lần tải lại từ trình duyệt. Không nên gán ngay lỗi cho cache.

**Mật khẩu không mở được CV:** có thể người dùng nhập sai, snapshot bị lỗi hoặc khóa mã hóa đã thay đổi. Trang phải báo không mở khóa được, thay vì hiển thị dữ liệu rỗng và khiến người dùng tưởng đã mất hồ sơ.

Đây là các kịch bản kiểm tra dựa trên kiến trúc hiện hành, **không phải khẳng định rằng mọi lỗi đã từng xảy ra hoặc đã được sửa xong**.

## 9. Điều đọng lại sau tiện ích Đơn xin việc

Sau ba kỳ TechTalk, tôi thấy một mẫu số chung ở các công cụ BlogNaver: màn hình chỉ là lớp cuối cùng. Phía sau nó là mô hình dữ liệu, quyền truy cập, điều kiện phát hiện thay đổi, cơ chế đồng bộ, cách báo lỗi và hành vi khi in hoặc tải lại trang.

Với **Đơn xin việc Việt–Hàn**, điều tôi muốn giữ lâu dài không chỉ là bốn trang A4 có bảng biểu đẹp. Đó là khả năng **chỉnh một chỗ, dùng ở nhiều chỗ**, không phải đánh đổi quyền riêng tư để có một bản CV trực tuyến, và không phải tự hỏi liệu website đang hiển thị thông tin mới nhất hay chưa.

Một website cá nhân không nhất thiết phải có backend phức tạp để tạo ra công cụ hữu ích. Nhưng khi dữ liệu liên quan đến danh tính và công việc, **sự đơn giản của giao diện phải được xây trên những ranh giới kỹ thuật rõ ràng**.

---

**Trải nghiệm và mã nguồn:** [Mở Đơn xin việc Việt–Hàn](/blognaver/tien-ich/don-xin-viec/) · [Frontend](https://github.com/duynguyenaver/blognaver/tree/main/static/tien-ich/don-xin-viec) · [Importer Python](https://github.com/duynguyenaver/blognaver/blob/main/scripts/sync-don-xin-viec.py) · [GitHub Actions workflow](https://github.com/duynguyenaver/blognaver/blob/main/.github/workflows/don-xin-viec-sync.yml).
