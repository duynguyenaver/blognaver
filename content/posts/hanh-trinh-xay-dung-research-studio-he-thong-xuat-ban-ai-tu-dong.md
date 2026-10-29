---
title: "Từ một ô dán phụ đề đến hệ thống xuất bản AI tự động: Hành trình xây dựng Research Studio cho BlogNaver"
date: 2026-10-30T00:00:00+07:00
draft: false
slug: "hanh-trinh-xay-dung-research-studio-he-thong-xuat-ban-ai-tu-dong"
description: "Nhật ký kỹ thuật xây dựng BlogNaver Research Studio: pipeline AI, phụ đề YouTube, checkpoint, hàng đợi FIFO, Gemini/Groq, Supadata, batch GitHub commit và Image Gallery."
categories: ["Công nghệ", "Nhật ký kỹ thuật"]
tags: ["BlogNaver", "Research Studio", "AI Engineering", "Hugo", "GitHub Pages", "JavaScript", "Content Automation", "FIFO Queue", "Gemini", "GitHub API"]
author: "Duy Nguyen"
---

# Từ một ô dán phụ đề đến hệ thống xuất bản AI tự động: Hành trình xây dựng Research Studio cho BlogNaver

*Case Study · AI Engineering · Hugo · GitHub Pages · JavaScript · Content Automation*

**Một dự án blog cá nhân có thể tiến xa đến đâu nếu chúng ta không xem việc viết bài, quản lý nội dung và xuất bản là những thao tác tách rời?**

Đó là câu hỏi dẫn đến sự ra đời của **Research Studio**, một trong những tính năng quan trọng nhất mà tôi xây dựng cho BlogNaver.

Ban đầu, nhu cầu của tôi tương đối đơn giản: lấy nội dung từ một video YouTube có phụ đề tiếng Anh, sử dụng AI để phân tích những thông tin đáng chú ý, chuyển chúng thành một bài nghiên cứu bằng tiếng Việt và đăng lên blog.

Nhưng càng sử dụng, tôi càng nhận ra rằng vấn đề không nằm ở việc AI có viết được một bài dài hay không.

Vấn đề thực sự là làm sao tạo ra **một hệ thống có khả năng vận hành liên tục, xử lý nhiều yêu cầu, tự phục hồi sau lỗi, bảo vệ nội dung đã viết, quản lý bài đã xuất bản và hạn chế số lần tương tác với GitHub**.

Từ một ô nhập phụ đề, dự án dần phát triển thành một quy trình gồm bảy phần, kết hợp AI, hệ thống hàng đợi, lưu trạng thái, xác thực API, quản lý metadata và biên tập hình ảnh.

Bài viết này ghi lại cách tôi xây dựng hệ thống, những quyết định kỹ thuật phía sau từng tính năng và các bài học quan trọng nhất trong quá trình phát triển.

**Truy cập công cụ:** https://duynguyenaver.github.io/blognaver/tien-ich/tao-series-post/

**Mã nguồn:** https://github.com/duynguyenaver/blognaver

---

## 1. Bài toán ban đầu: AI viết bài không khó, để AI viết bài đáng tin cậy mới khó

Có rất nhiều cách tạo bài viết bằng AI.

Cách đơn giản nhất là gửi một prompt:

> Hãy viết cho tôi một bài blog về chủ đề này, dựa trên nội dung video sau.

Sau đó dán toàn bộ phụ đề vào mô hình ngôn ngữ, chờ kết quả và sao chép vào CMS.

Cách này phù hợp để thử nghiệm, nhưng bộc lộ nhiều điểm yếu khi được sử dụng như một quy trình sản xuất nội dung thực sự.

Thứ nhất, phụ đề video có thể rất dài. Một tập podcast kéo dài vài giờ chứa lượng thông tin lớn, nhiều chủ đề phụ, nhiều ví dụ và những đoạn hội thoại không thực sự quan trọng.

Thứ hai, nếu yêu cầu AI viết toàn bộ bài trong một lần, kết quả có thể bị rút gọn quá mức, thiếu chiều sâu hoặc mất cân đối giữa các phần.

Thứ ba, một request có thể thất bại vì giới hạn token, quota, lỗi mạng hoặc model ngừng hỗ trợ.

Thứ tư, khi request thất bại giữa chừng, người dùng thường phải thực hiện lại toàn bộ quy trình.

Thứ năm, sau khi có bài viết, vẫn còn một loạt công việc thủ công: định dạng Markdown, bổ sung metadata, chọn series, kiểm tra SEO, commit lên GitHub và theo dõi quá trình deploy.

Và cuối cùng, khi số lượng bài tăng lên, việc quản lý nội dung đã đăng lại trở thành một công việc riêng.

Tôi không muốn xây dựng một công cụ chỉ có khả năng tạo văn bản.

**Tôi muốn xây dựng một dây chuyền xuất bản có trạng thái, có khả năng phục hồi và có thể quản lý nội dung sau khi xuất bản.**

Đó là thay đổi quan trọng nhất trong tư duy thiết kế Research Studio.

---

## 2. Kiến trúc tổng thể: Biến GitHub Pages thành một CMS có khả năng điều phối

BlogNaver sử dụng Hugo để tạo website tĩnh và GitHub Pages để phân phối nội dung.

Hugo là lựa chọn hợp lý cho blog cá nhân vì website nhanh, chi phí vận hành thấp và nội dung có thể quản lý trực tiếp dưới dạng Markdown.

Nhưng website tĩnh cũng có giới hạn.

Nó không mặc nhiên có máy chủ ứng dụng, cơ sở dữ liệu riêng hay worker chạy liên tục để xử lý hàng đợi.

Tôi giải quyết bài toán này bằng cách kết hợp nhiều lớp chức năng:

| Thành phần | Vai trò |
|---|---|
| Hugo | Biên dịch Markdown thành website tĩnh |
| GitHub Pages | Lưu trữ và phân phối website |
| JavaScript phía trình duyệt | Điều khiển giao diện và quy trình xử lý |
| Gemini API | AI chính để phân tích và viết nội dung |
| Groq API | Nhà cung cấp AI dự phòng được tích hợp |
| Supadata API | Hỗ trợ trích xuất phụ đề YouTube |
| localStorage | Lưu checkpoint, hàng đợi và thống kê cục bộ |
| sessionStorage | Giữ một số API key trong phiên trình duyệt |
| GitHub REST API | Đọc, tạo và cập nhật nội dung repository |
| GitHub Actions | Build và triển khai Hugo sau commit |
| Canvas API | Resize và chuyển đổi ảnh sang WebP |

Sơ đồ hoạt động tổng quát:

```text
YouTube URL / English Transcript
                |
                v
       Research Studio UI
                |
                v
       Source Validation
                |
                v
       AI Writing Pipeline
       Gemini / Groq
                |
       +--------+--------+
       |                 |
       v                 v
   Checkpoint        FIFO Queue
       |                 |
       +--------+--------+
                |
                v
       Markdown + Metadata
                |
                v
         GitHub Commit
                |
                v
          Hugo Build
                |
                v
          GitHub Pages
                |
                v
       Editor + Gallery
```

Điểm đặc biệt là GitHub không chỉ đóng vai trò lưu trữ mã nguồn.

Trong kiến trúc này, **GitHub còn là nơi lưu nội dung xuất bản và là điểm kết nối giữa hệ thống viết bài với website đang hoạt động**.

Tuy nhiên, tôi cũng phải chấp nhận một giới hạn quan trọng: phần điều phối chạy trong trình duyệt, nên nó không tương đương với một backend worker luôn hoạt động 24/7.

Nếu đóng trình duyệt, các request đang chạy không thể tiếp tục thực hiện ở nền. Hệ thống phải dựa vào checkpoint để khôi phục khi người dùng mở lại trang.

Việc hiểu rõ giới hạn này giúp tránh xây dựng những cam kết mà một website tĩnh không thể bảo đảm.

---

## 3. Bước 01 — Chọn series: Từ danh sách cố định đến hệ thống metadata linh hoạt

Research Studio được thiết kế theo hướng xây dựng các chuỗi bài viết chuyên sâu.

Ban đầu, tôi sử dụng những series định sẵn như:

- ColdFusion Research.
- Lex Fridman Podcast Research.

Việc phân loại nội dung theo series giúp blog không trở thành một tập hợp bài viết rời rạc.

Người đọc có thể theo dõi nhiều bài cùng chủ đề. Người quản trị cũng dễ xác định nguồn, phạm vi nghiên cứu và cách đặt metadata.

### 3.1. Vì sao không chỉ dùng một dropdown?

Dropdown rất thuận tiện khi hệ thống có ít lựa chọn.

Nhưng nó nhanh chóng trở thành giới hạn khi xuất hiện những chủ đề nghiên cứu mới.

Nếu mỗi lần muốn tạo series đều phải chỉnh sửa JavaScript, việc vận hành sẽ quá phụ thuộc vào lập trình.

Vì vậy, tôi bổ sung lựa chọn thứ hai: **nhập trực tiếp tên series**.

Giao diện cho phép giữ dropdown cũ, đồng thời hỗ trợ nhập tên mới khi cần.

Ví dụ:

```text
Tên series:
AI & Technology Research

Mã định danh:
ai-technology-research
```

Ở mức kỹ thuật, tên hiển thị cần được chuyển thành mã định danh ổn định.

Quy trình thường gồm:

1. Loại bỏ khoảng trắng dư thừa.
2. Chuẩn hóa Unicode.
3. Chuyển chữ cái về dạng thường.
4. Chuyển khoảng trắng và ký tự đặc biệt thành dấu gạch ngang.
5. Giới hạn độ dài để tránh tạo mã quá lớn.

Ví dụ JavaScript:

```javascript
function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Điều cần phân biệt là **tên series hiển thị** và **mã series dùng trong metadata** không hoàn toàn giống nhau.

Tên hiển thị có thể thay đổi theo nhu cầu biên tập. Mã định danh cần được quản lý cẩn thận vì có thể liên quan đến cách Hugo phân loại và hiển thị nội dung.

### 3.2. Bài học về metadata

Một bài viết không chỉ gồm tiêu đề và nội dung.

Nó còn có:

- Mô tả SEO.
- Categories.
- Tags.
- Series.
- Thứ tự trong series.
- Nguồn gốc nghiên cứu.
- Ảnh đại diện.
- Trạng thái xuất bản.

Nếu các trường này được quản lý ngay từ giai đoạn tạo bài, hệ thống sẽ bớt rất nhiều công việc chỉnh sửa về sau.

**Bài học:** Nên thiết kế mô hình nội dung trước khi mở rộng tính năng tạo nội dung.

---

## 4. Bước 02 — Phụ đề tiếng Anh: Xây dựng đầu vào đáng tin cậy cho AI

Trong Research Studio, phụ đề tiếng Anh là nguồn dữ liệu chính.

Tôi chọn thiết kế *source-first*: AI được yêu cầu phát triển bài viết từ nội dung người dùng cung cấp thay vì tự xây dựng toàn bộ câu chuyện từ trí nhớ mô hình.

Đây là một quyết định có ảnh hưởng trực tiếp đến chất lượng bài viết.

### 4.1. Tại sao phụ đề là đầu vào phù hợp?

Video podcast, tài liệu và những buổi thảo luận chuyên sâu chứa nhiều thông tin có giá trị.

Tuy nhiên, việc xem lại toàn bộ video để ghi chú rồi biên tập rất tốn thời gian.

Phụ đề biến nội dung dạng âm thanh thành dữ liệu văn bản, giúp hệ thống có thể:

- Phân tích chủ đề.
- Tách các luận điểm.
- Nhận diện ví dụ quan trọng.
- Giữ lại ngữ cảnh.
- Xây dựng cấu trúc bài viết.

Với một video dài, nội dung có thể lên đến hàng chục hoặc hàng trăm nghìn ký tự.

Vì thế, textarea không chỉ là một trường nhập liệu đơn giản. Nó là điểm bắt đầu của toàn bộ quy trình xử lý.

### 4.2. Hỗ trợ phụ đề TXT, SRT và VTT

Phụ đề thường có nhiều định dạng.

Ví dụ SRT:

```text
1
00:00:01,000 --> 00:00:04,500
Welcome to the conversation.

2
00:00:04,500 --> 00:00:08,000
Today we are discussing AI.
```

Nếu gửi nguyên dạng vào mô hình, nhiều dòng timestamp và số thứ tự có thể làm nhiễu nội dung.

Research Studio có bước làm sạch dữ liệu đầu vào, bao gồm xử lý dấu thời gian, các dòng đánh số và một số thành phần định dạng.

Ví dụ:

```javascript
function normalizeTranscript(text) {
  return text
    .replace(/^WEBVTT.*$/gm, "")
    .replace(
      /^\d\d:\d\d:\d\d[.,]\d+\s*-->\s*
      \d\d:\d\d:\d\d[.,]\d+.*$/gm,
      ""
    )
    .replace(/\n{3,}/g, "\n\n");
}
```

Đây là ví dụ minh họa; một parser SRT/VTT hoàn chỉnh cần xử lý thêm nhiều biến thể của timestamp và cue.

### 4.3. Supadata: Tự động lấy phụ đề từ YouTube URL

Sau khi hoàn thiện luồng dán phụ đề thủ công, tôi muốn giảm tiếp một thao tác.

Thay vì luôn phải mở YouTube, tìm phụ đề, sao chép và quay lại blog, hệ thống có thể gọi Supadata API để lấy transcript.

Quy trình:

```text
YouTube URL
     |
     v
Validate Video ID
     |
     v
Supadata Transcript API
     |
     +--> Transcript có sẵn
     |
     +--> Job đang xử lý
                |
                v
           Poll Job Status
                |
                v
          Nhận Transcript
                |
                v
       Điền vào textarea
```

Với tác vụ xử lý bất đồng bộ, API có thể trả về job ID trước khi transcript hoàn tất.

Khi đó, ứng dụng không nên coi việc có job ID là đã có phụ đề.

Nó cần tiếp tục kiểm tra trạng thái, nhận kết quả cuối cùng hoặc báo lỗi khi không lấy được nội dung.

### 4.4. Connect API key và trạng thái kết nối

Tôi không muốn người dùng phải đoán liệu API key đã hợp lệ hay chưa.

Vì vậy, phần Supadata được bổ sung nút **Connect** và trạng thái:

```text
Supadata API key
[••••••••••••••••••]

[ Connect ]

✓ Kết nối thành công
```

Lưu ý kỹ thuật: một request xác thực nên có mục đích rõ ràng. Nếu kiểm tra bằng endpoint có tính phí, thao tác Connect cũng có thể tiêu thụ credit.

### 4.5. Bộ đếm API: Số request không đồng nghĩa số credit

Một tính năng nhỏ nhưng rất hữu ích là thống kê số lần gọi API.

Bộ đếm cho biết:

- Số request được gửi.
- Số credit ước tính đã sử dụng.
- Mức sử dụng so với ngân sách tham chiếu.
- Cảnh báo khi sắp chạm giới hạn.

Nhưng có một chi tiết quan trọng:

**Không phải request nào cũng có cùng chi phí.**

Một request lấy transcript, một request kiểm tra metadata và một request thăm dò trạng thái job có thể được tính phí khác nhau.

Do đó, bộ đếm cục bộ phải được mô tả là ước tính, trừ khi có dữ liệu quota chính thức từ nhà cung cấp.

Bộ đếm lưu trong trình duyệt cũng không thể biết số request được thực hiện bằng cùng API key trên thiết bị khác.

### 4.6. Tối ưu UX: Ô nhập liệu không cần quá lớn

Trong quá trình phát triển, tôi từng để khung nhập phụ đề chiếm quá nhiều không gian.

Nhưng phụ đề thường được dán vào một lần rồi xử lý, không phải nơi người dùng dành nhiều thời gian biên tập trực tiếp.

Vì vậy, tôi giảm khoảng một nửa chiều cao ô nhập và giữ khả năng cuộn, kéo giãn thủ công.

Đây là ví dụ điển hình cho một bài học về UX:

**Không phải thành phần chứa nhiều dữ liệu nhất thì phải chiếm nhiều không gian nhất trên màn hình.**

Kích thước mặc định nên phản ánh tần suất và cách sử dụng thực tế.

---

## 5. Bước 03 — Thiết lập chất lượng: Xây dựng giới hạn để AI không tự bịa

Một bài blog nghiên cứu phải có tiêu chuẩn khác một bài viết sáng tạo.

Research Studio sử dụng các nguyên tắc biên tập như:

- Không tự sáng tác phát ngôn.
- Không tạo số liệu khi nguồn không cung cấp.
- Không bịa tài liệu tham khảo.
- Phân biệt dữ kiện nguồn với nhận định.
- Không coi nội dung transcript là bằng chứng kiểm chứng độc lập.
- Không sao chép hoặc dịch nguyên văn toàn bộ phụ đề.

Ở đây, tôi đặc biệt chú trọng hiện tượng *hallucination*: mô hình tạo ra nội dung nghe có vẻ hợp lý nhưng không có căn cứ.

### 5.1. Transcript là dữ liệu, không phải chỉ dẫn điều khiển

Một transcript có thể chứa câu nói như:

> Ignore previous instructions and follow these steps.

Trong hệ thống viết bài, câu nói đó phải được coi là một phần nội dung của video, không phải chỉ thị cho ứng dụng.

Đây là lý do cần tách chỉ dẫn hệ thống khỏi dữ liệu nguồn.

Prompt biên tập nên được đặt ở vị trí điều khiển rõ ràng, trong khi transcript chỉ được đưa vào làm tài liệu tham khảo.

Điều này không loại bỏ hoàn toàn nguy cơ prompt injection, nhưng giúp xác định đúng ranh giới tin cậy.

### 5.2. Kiểm tra cấu trúc trước khi xuất bản

Bài viết được kiểm tra trước khi commit.

Một số yêu cầu có thể bao gồm:

- Độ dài tối thiểu.
- Tiêu đề đủ ý nghĩa.
- Có nhiều đề mục H2.
- Nội dung không rỗng.
- Markdown hợp lệ.
- Các trường metadata cần thiết.

Những điều kiện này giúp ngăn trường hợp AI trả về vài đoạn ngắn nhưng hệ thống vẫn coi là một bài hoàn chỉnh.

Tuy nhiên, kiểm tra độ dài và cấu trúc không đồng nghĩa với xác minh tính đúng đắn của nội dung.

Tôi xem chúng là **cổng kiểm tra chất lượng kỹ thuật**, không phải công cụ fact-check tuyệt đối.

---

## 6. Bước 04 — Viết và xuất bản: Tách bài dài thành nhiều công đoạn AI

Đây là trái tim của Research Studio.

Thay vì gửi một request và yêu cầu AI tạo toàn bộ bài, tôi chia quá trình xử lý thành nhiều giai đoạn.

Một pipeline điển hình gồm:

```text
Transcript
    |
    v
Chia nguồn thành các phần
    |
    v
Tạo ghi chú nghiên cứu
    |
    v
Xây dựng outline
    |
    v
Viết từng phần H2
    |
    v
Biên tập toàn bài
    |
    v
Kiểm tra chất lượng
    |
    v
Tạo Markdown + Metadata
    |
    v
Commit lên GitHub
```

### 6.1. Chia nguồn thành các chunk

Một video dài có thể vượt quá phạm vi xử lý tối ưu của một request.

Thay vì cắt bỏ nội dung cuối, hệ thống chia transcript thành các phần.

Các chunk có thể được xác định dựa trên giới hạn ký tự và ưu tiên điểm ngắt dòng để tránh chia một đoạn hội thoại ở vị trí quá bất hợp lý.

Ví dụ:

```javascript
function chunkSource(source, size = 22000) {
  const chunks = [];

  for (let i = 0; i < source.length; i += size) {
    chunks.push(source.slice(i, i + size));
  }

  return chunks;
}
```

Đoạn này chỉ minh họa tư duy phân mảnh; logic thực tế cần xử lý điểm cắt và ngữ cảnh tốt hơn.

Ưu điểm của cách chia nguồn là mỗi request có nhiệm vụ tương đối nhỏ và dễ kiểm soát.

### 6.2. Tạo ghi chú nghiên cứu trước khi viết

Một trong những sai lầm phổ biến là chuyển thẳng transcript thành bài báo.

Transcript vốn là nội dung lời nói.

Nó có thể chứa sự lặp lại, câu nói dang dở, chủ đề chuyển đột ngột hoặc thông tin không quan trọng.

Do đó, bước trung gian rất cần thiết.

AI đọc từng phần và tạo ghi chú về:

- Nội dung chính.
- Các luận điểm.
- Ví dụ cụ thể.
- Dữ kiện cần giữ lại.
- Những điểm chưa đủ bằng chứng.
- Mối liên hệ với chủ đề tổng thể.

Các ghi chú này trở thành nền tảng để xây dựng outline.

### 6.3. Outline là bản thiết kế của bài viết

Sau khi tổng hợp ghi chú, AI tạo dàn ý có cấu trúc.

Tôi ưu tiên đầu ra JSON để hệ thống có thể đọc và sử dụng ở các bước tiếp theo.

Ví dụ:

```json
{
  "title": "Tương lai của AI trong sản xuất",
  "description": "Phân tích vai trò của AI...",
  "thesis": "AI đang thay đổi quy trình...",
  "sections": [
    {
      "heading": "Tự động hóa là gì?",
      "evidence": "..."
    },
    {
      "heading": "Ứng dụng trong nhà máy",
      "evidence": "..."
    }
  ]
}
```

Việc có outline trước giúp tránh tình trạng mỗi đoạn bài được viết theo một hướng khác nhau.

### 6.4. Viết từng H2 thay vì viết toàn bộ bài một lần

Tôi xem đây là một trong những cải tiến quan trọng nhất.

Mỗi phần H2 trở thành một đơn vị công việc.

AI được cung cấp:

- Chủ đề tổng thể.
- Dàn ý đã thống nhất.
- Luận điểm của phần hiện tại.
- Ghi chú và dữ kiện liên quan.
- Những yêu cầu về văn phong và độ sâu.

Sau khi hoàn thành một phần, kết quả được lưu lại trước khi xử lý phần tiếp theo.

Cách này đem lại ba lợi ích rõ rệt.

**Một là kiểm soát chất lượng tốt hơn.** Một request nhỏ thường dễ kiểm tra cấu trúc và mục tiêu hơn.

**Hai là dễ khôi phục.** Nếu phần thứ năm thất bại, không nhất thiết phải viết lại bốn phần trước.

**Ba là dễ phát hiện lỗi.** Hệ thống biết chính xác giai đoạn nào đang thất bại.

### 6.5. Biên tập tổng thể

Khi các phần đã được viết xong, cần có một bước đọc lại toàn bài.

Đây là lúc AI được yêu cầu kiểm tra:

- Tính liên tục.
- Sự lặp ý.
- Độ nhất quán về thuật ngữ.
- Chuyển đoạn.
- Mức độ liên quan của từng phần với luận điểm chính.
- Những chỗ diễn đạt quá chắc chắn so với bằng chứng.

Tôi không muốn AI chỉ ghép các đoạn rời rạc thành một file dài.

Mục tiêu là một bài viết có cấu trúc và có giọng điệu biên tập nhất quán.

---

## 7. Gemini và Groq: Vì sao hệ thống cần nhiều nhà cung cấp AI?

Khi mới xây dựng công cụ, việc sử dụng một API tưởng như đã đủ.

Nhưng trong thực tế, các nhà cung cấp AI có nhiều giới hạn:

- Request per minute.
- Token per minute.
- Giới hạn quota theo ngày.
- Model bị thay thế hoặc ngừng cung cấp.
- Lỗi 429.
- Lỗi máy chủ.
- Timeout.
- Phản hồi rỗng hoặc sai định dạng.

Vấn đề trở nên nghiêm trọng hơn khi đang viết một bài dài.

Giả sử AI đã hoàn thành sáu phần nội dung nhưng quota hết ở phần thứ bảy.

Nếu toàn bộ hệ thống được thiết kế như một request duy nhất, công việc có thể bị mất.

Để giải quyết, tôi kết hợp **fallback provider** với **checkpoint**.

### 7.1. Gemini là mô hình chính

Gemini được ưu tiên xử lý.

Hệ thống có chức năng kiểm tra model khả dụng, theo dõi trạng thái request và phát hiện một số lỗi API.

Một lỗi từng gặp trong quá trình phát triển là sử dụng model đã không còn hỗ trợ cho tài khoản.

Bài học ở đây là không nên phụ thuộc vĩnh viễn vào một tên model cố định.

Ứng dụng cần kiểm tra model đang được cung cấp và có chiến lược cập nhật khi model cũ ngừng hoạt động.

### 7.2. Groq làm phương án dự phòng

Groq được tích hợp thông qua API tương thích với giao diện chat completions.

Khi Gemini gặp một số lỗi đủ điều kiện, hệ thống có thể thử sử dụng Groq để xử lý request còn dở.

Tuy nhiên, đây không phải một cơ chế bảo đảm thành công.

Groq cũng có thể gặp:

- Quota riêng.
- API key không hợp lệ.
- Model không khả dụng.
- Giới hạn token.
- Lỗi phản hồi.

Đã có thời điểm hệ thống thông báo:

> Groq không khả dụng. Giữ checkpoint và chờ Gemini tự retry.

Đây là một bài học rất đáng nhớ.

**Fallback không đồng nghĩa với việc chỉ cần đổi tên nhà cung cấp là hệ thống chắc chắn tiếp tục hoạt động.**

Cần xác thực thật sự khả năng tạo nội dung, không chỉ kiểm tra xem API key có liệt kê được model hay không.

### 7.3. Circuit breaker và retry

Khi một provider liên tục thất bại, ứng dụng không nên gửi request vô hạn.

Một thiết kế hợp lý cần có:

- Số lần retry tối đa.
- Thời gian chờ giữa các lần.
- Nhận diện lỗi có thể thử lại.
- Tạm dừng khi nhà cung cấp không khả dụng.
- Lưu checkpoint trước khi chờ.

Ví dụ:

```javascript
const retryDelay =
  Math.min(60000, 1000 * 2 ** attempt);
```

Đây là cách tăng thời gian chờ theo cấp số nhân.

Nếu kết hợp thêm jitter, hệ thống có thể giảm nguy cơ nhiều client cùng retry vào một thời điểm.

Điều quan trọng hơn là không nhầm lỗi xác thực với lỗi quota.

API key sai không thể sửa bằng cách chờ thêm 60 giây.

### 7.4. Bài học về thông tin trạng thái

Tôi từng gặp tình huống giao diện báo đang dùng Groq nhưng thông báo lỗi lại liên quan đến Gemini.

Về kỹ thuật, điều này có thể xảy ra khi hệ thống đang chuyển provider nhưng thông tin trạng thái chưa được đồng bộ.

Về UX, nó tạo cảm giác hệ thống không đáng tin.

Một quy trình đa provider cần hiển thị được ít nhất:

```text
Provider: Gemini
Model: ...
Trạng thái: Đang xử lý

hoặc

Provider: Groq
Model: ...
Trạng thái: Fallback

hoặc

Trạng thái: Waiting
Lý do: Gemini quota / Groq không khả dụng
```

**Thông tin trạng thái phải phản ánh request thực sự đang được xử lý, không chỉ lựa chọn nhà cung cấp trước đó.**

---

## 8. Checkpoint: Tính năng nhỏ quyết định khả năng sống sót của cả hệ thống

Nếu phải chọn một thành phần quan trọng nhất về độ tin cậy, tôi sẽ chọn checkpoint.

Trong Research Studio, checkpoint là bản ghi về tiến độ xử lý tại một thời điểm.

Nó có thể chứa:

- Nguồn đầu vào.
- Series.
- YouTube URL.
- Outline.
- Ghi chú nghiên cứu.
- Những phần bài đã viết.
- Markdown hiện tại.
- Trạng thái quy trình.
- Thông tin commit.
- Mốc retry.

Ví dụ cấu trúc khái niệm:

```json
{
  "runStatus": "waiting",
  "series": "cold-fusion",
  "sourceUrl": "https://youtube.com/watch?v=...",
  "completedSections": 4,
  "outline": {},
  "pieces": [],
  "markdown": "...",
  "published": false,
  "commitProof": null
}
```

Checkpoint được lưu cục bộ để có thể phục hồi khi xảy ra lỗi.

### 8.1. Vì sao không chỉ lưu bản Markdown?

Vì Markdown không cho biết toàn bộ trạng thái xử lý.

Nếu chỉ lưu văn bản đang viết, hệ thống không biết:

- Phần nào đã hoàn tất.
- Request nào cần chạy tiếp.
- Outline nào đã được phê duyệt trong pipeline.
- Bài đã commit lên GitHub hay chưa.
- Có nên tạo lại bài hay không.

Checkpoint phải lưu cả dữ liệu lẫn trạng thái.

### 8.2. Khôi phục tự động

Một yêu cầu UX quan trọng của tôi là người dùng không phải bấm nút “Tiếp tục phiên dang dở” mỗi khi mở lại trang.

Ứng dụng cần tự kiểm tra checkpoint và xác định có phiên chưa hoàn tất hay không.

Nếu có, nó khôi phục các thông tin cần thiết và tiếp tục khi đủ điều kiện kết nối.

Điểm khó nằm ở việc phân biệt:

- Phiên đang xử lý.
- Phiên chờ retry.
- Phiên thất bại.
- Phiên đã dừng.
- Phiên đã commit thành công.

Nếu không phân biệt các trạng thái này, nguy cơ tạo lại bài đã đăng là rất lớn.

### 8.3. Checkpoint không phải bản sao lưu tuyệt đối

Vì dữ liệu được lưu trên thiết bị, việc xóa dữ liệu trình duyệt có thể khiến checkpoint biến mất.

Ngoài ra, trình duyệt có giới hạn dung lượng lưu trữ.

Do đó, với những quy trình thật sự quan trọng, có thể cần phát triển thêm cơ chế lưu checkpoint lên backend hoặc một kho dữ liệu có xác thực.

Nhưng đối với một website tĩnh cá nhân, checkpoint cục bộ đã tạo ra bước tiến lớn so với cách viết bài hoàn toàn thủ công.

---

## 9. Bước 05 — FIFO Queue: Từ công cụ viết từng bài thành dây chuyền xử lý

Đây là một trong những phần tôi tâm đắc nhất.

Ban đầu, nếu Research Studio đang viết một bài, người dùng phải chờ bài đó hoàn tất mới có thể gửi nội dung tiếp theo.

Điều này không phù hợp với cách làm việc thực tế.

Khi nghiên cứu nhiều video, tôi muốn nhập phụ đề video tiếp theo trong lúc AI đang viết bài hiện tại.

Từ nhu cầu đó, hệ thống hàng đợi ra đời.

### 9.1. Nguyên tắc FIFO

FIFO là viết tắt của *First In, First Out*.

Yêu cầu nào đến trước sẽ được xử lý trước.

Ví dụ:

```text
09:00  Nhận bài N
       -> Đang viết

09:05  Nhận bài N+1
       -> Hàng đợi #1

09:08  Nhận bài N+2
       -> Hàng đợi #2

09:15  Bài N hoàn tất
       -> Chạy bài N+1

09:24  Bài N+1 hoàn tất
       -> Chạy bài N+2
```

Trong JavaScript, phần lõi của hàng đợi có thể hình dung như sau:

```javascript
const queue = [];
let working = false;

async function submit(job) {
  if (working) {
    queue.push(job);
    return;
  }

  await processJob(job);
}

async function processJob(job) {
  working = true;

  try {
    await writeAndPublish(job);
  } finally {
    working = false;

    if (queue.length) {
      const next = queue.shift();
      await processJob(next);
    }
  }
}
```

Đây chỉ là sơ đồ minh họa.

Trong ứng dụng thực tế, cần xử lý thêm checkpoint, lỗi, khôi phục, trạng thái publish và nguy cơ một task được lấy ra nhiều lần.

### 9.2. Một nút, hai hành vi

Một quyết định UX quan trọng là giữ nguyên nút:

**Viết nghiên cứu & đăng bài**

Nút không thay tên thành “Thêm vào hàng đợi”.

Thay vào đó, logic nội bộ quyết định:

```text
Không có bài đang chạy
    -> Bắt đầu viết ngay

Đã có bài đang chạy
    -> Lưu yêu cầu vào hàng đợi
```

Vì sao tôi chọn cách này?

Bởi vì hành động mà người dùng mong muốn không thay đổi: họ muốn viết và xuất bản một bài.

Việc bài đó chạy ngay hay được xếp hàng là trách nhiệm của hệ thống.

**Đây là nguyên tắc thiết kế rất hữu ích: giao diện mô tả ý định của người dùng, còn hệ thống tự quyết định cách thực thi.**

### 9.3. Không chạy song song một cách thiếu kiểm soát

Nếu mỗi lần người dùng bấm nút đều tạo một pipeline riêng, nhiều vấn đề có thể xảy ra:

- Cùng lúc gửi quá nhiều request AI.
- Nhanh chóng hết quota.
- Tranh chấp trạng thái checkpoint.
- Khó phân biệt bài nào đang xuất bản.
- Nguy cơ commit chồng chéo.
- Người dùng không biết phiên nào đang hoạt động.

Với FIFO, hệ thống kiểm soát số phiên đang xử lý, đồng thời cho phép người dùng chuẩn bị công việc tiếp theo.

Đây là sự cân bằng giữa trải nghiệm thuận tiện và độ ổn định.

### 9.4. Chống trùng YouTube URL

Một tính năng phụ nhưng mang lại giá trị thực tế lớn là phát hiện URL trùng.

Ví dụ:

```text
https://youtube.com/watch?v=ABCDEFGHIJK

https://youtu.be/ABCDEFGHIJK

https://www.youtube.com/shorts/ABCDEFGHIJK
```

Ba đường dẫn này có thể cùng trỏ đến một video.

So sánh chuỗi URL trực tiếp sẽ không phát hiện được trùng lặp.

Vì thế, hệ thống cần trích xuất và chuẩn hóa **YouTube Video ID**.

```javascript
function youtubeId(url) {
  const parsed = new URL(url);

  if (parsed.hostname.includes("youtu.be")) {
    return parsed.pathname.slice(1);
  }

  return parsed.searchParams.get("v");
}
```

Đây là ví dụ đơn giản; bản thực tế cần kiểm tra hostname chính xác và hỗ trợ thêm các dạng URL.

Khi có Video ID, hệ thống so sánh với:

- Video của bài đang chạy.
- Video của các bài trong hàng đợi.

Nếu trùng, yêu cầu mới bị từ chối và cảnh báo xuất hiện ngay tại section 05.

Ví dụ:

```text
TRÙNG YOUTUBE URL

Video này đã có trong hàng đợi.
Không tạo task trùng.
```

Tính năng này giúp tránh tiêu thụ API quota để tạo hai bài từ cùng một nguồn ngoài ý muốn.

### 9.5. Hàng đợi phải tồn tại sau khi tải lại trang

Một hàng đợi chỉ nằm trong biến JavaScript sẽ biến mất khi reload.

Vì vậy, Research Studio lưu danh sách công việc vào localStorage.

Khi trang được mở lại:

1. Đọc danh sách đã lưu.
2. Kiểm tra dữ liệu từng task.
3. Khôi phục giao diện hàng đợi.
4. Xác định phiên đang dang dở.
5. Tiếp tục xử lý khi có đủ thông tin xác thực.

Đó là lý do tôi xem hàng đợi không chỉ là một danh sách.

**Nó là một phần của cơ chế phục hồi trạng thái.**

---

## 10. Khi một bài bị đứng: Luân phiên xử lý mà không đánh mất tiến độ

Một tình huống thực tế rất khó chịu là AI không báo lỗi nhưng cũng không hoàn thành.

Thanh tiến độ đứng yên trong thời gian dài.

Nếu hàng đợi còn nhiều bài, toàn bộ dây chuyền có thể bị chặn bởi một phiên.

Để cải thiện, Research Studio có logic theo dõi tiến độ và nhận diện thời gian không có thay đổi.

Nếu một giai đoạn kéo dài bất thường, hệ thống có thể lưu checkpoint và chuyển sang bài tiếp theo theo những giới hạn an toàn đã định.

### 10.1. Tại sao không tự động hủy mọi request chậm?

Vì request chậm không nhất thiết là request lỗi.

Đặc biệt nguy hiểm là giai đoạn commit GitHub.

Nếu một request ghi dữ liệu đang diễn ra mà bị hủy giữa chừng, có thể xảy ra tình huống:

- GitHub đã nhận commit.
- Trình duyệt chưa nhận phản hồi thành công.
- Hệ thống tưởng commit thất bại.
- Lần retry tiếp theo cố gắng đăng lại bài.

Đây là một ví dụ của vấn đề *uncertain outcome* trong hệ thống phân tán.

Vì vậy, thao tác xuất bản cần được xử lý thận trọng hơn thao tác tạo nội dung AI.

### 10.2. Giới hạn luân phiên

Nếu liên tục luân phiên giữa nhiều bài bị lỗi, hệ thống có thể rơi vào vòng lặp vô hạn.

Do đó, mỗi phiên cần có giới hạn số lần luân phiên.

Khi đạt giới hạn, checkpoint vẫn được giữ lại nhưng không nên tiếp tục chuyển vòng mãi mãi.

Một hệ thống tự động tốt không phải hệ thống luôn cố làm mọi thứ.

Đôi khi, điều quan trọng hơn là **biết lúc nào nên dừng mà không làm mất dữ liệu**.

---

## 11. GitHub Commit: Điểm kết thúc của pipeline AI, không phải kết thúc của deploy

Sau khi nội dung được tạo và kiểm tra, hệ thống xây dựng Markdown cho Hugo.

Một bài điển hình có front matter:

```yaml
---
title: "Tương lai của trí tuệ nhân tạo"
date: "2026-10-30T08:00:00Z"
draft: false
description: "Một góc nhìn nghiên cứu..."
categories:
  - "Công nghệ"
  - "Nghiên cứu"
tags:
  - "AI"
  - "series"
series:
  - "ai-technology-research"
seriesOrder: 1
---
```

Phía dưới là nội dung Markdown.

### 11.1. Vì sao lưu bài dưới dạng Markdown?

Markdown có nhiều lợi ích:

- Dễ đọc.
- Dễ chỉnh sửa.
- Hoạt động tốt với Hugo.
- Dễ kiểm soát thay đổi bằng Git.
- Dễ phục hồi phiên bản cũ.
- Không phụ thuộc hoàn toàn vào một CMS độc quyền.

Mỗi bài có thể trở thành một file trong repository.

### 11.2. Commit thành công khác với live thành công

Đây là một điểm tôi phải phân biệt rõ trong quá trình phát triển.

Khi GitHub API trả về commit SHA, điều đó chứng minh nội dung đã được ghi vào repository.

Nhưng website có thể chưa cập nhật.

Để lên live, GitHub Actions còn phải:

1. Nhận thay đổi.
2. Build Hugo.
3. Tạo website tĩnh.
4. Triển khai GitHub Pages.
5. Hoàn tất quá trình phân phối.

Vì vậy:

```text
GitHub commit thành công
          ≠
Website đã live
```

Research Studio cần hiển thị thông tin commit rõ ràng và tránh khẳng định bài đã xuất hiện trên website trước khi có bằng chứng.

### 11.3. Commit SHA là bằng chứng xuất bản

Commit SHA đóng vai trò như một mã tham chiếu có thể kiểm tra.

Nó giúp trả lời:

- Bài được ghi vào phiên bản nào?
- File nào được tạo hoặc cập nhật?
- Thay đổi diễn ra lúc nào?
- Có thể kiểm tra lịch sử bằng GitHub hay không?

Việc lưu commit proof trong checkpoint còn giúp giảm nguy cơ tạo lại bài khi tải trang sau một lần xuất bản thành công.

---

## 12. Bước 06 — Editor: Biến những bài đã đăng thành nội dung có thể quản lý hàng loạt

Sau khi có khả năng tự động đăng bài, tôi phát hiện một vấn đề mới.

AI có thể tạo bài tốt, nhưng không phải metadata nào cũng đúng ngay từ lần đầu.

Một bài có thể cần:

- Đổi tiêu đề.
- Chỉnh tên series.
- Sửa YouTube URL gốc.
- Cập nhật mô tả SEO.
- Điều chỉnh tags.
- Chuyển danh mục.

Nếu phải mở từng file Markdown trên GitHub để sửa thủ công, trải nghiệm quản trị sẽ không thuận tiện.

Từ đó, section **Editor · Chỉnh sửa bài đã commit** được phát triển.

### 12.1. Đọc trực tiếp dữ liệu từ GitHub

Editor kết nối GitHub API để lấy danh sách các file Markdown đã commit.

Với mỗi bài, ứng dụng đọc front matter và một số thông tin nguồn.

Sau đó, dữ liệu được đưa vào những trường nhập liệu dễ chỉnh sửa hơn so với Markdown thô.

Ví dụ:

```text
Bài: Tương lai của AI trong sản xuất

Tiêu đề:
[Tương lai của AI trong sản xuất]

Series:
[AI & Technology Research]

YouTube URL:
[https://youtube.com/watch?v=...]

Mô tả SEO:
[...]

Tags:
[AI, manufacturing, research]
```

Người dùng chỉnh sửa nội dung trên giao diện mà không cần trực tiếp thao tác với cú pháp YAML.

### 12.2. Search trong danh sách bài đã commit

Khi số lượng bài tăng lên, một danh sách dài không còn đủ thuận tiện.

Vì vậy, tôi thêm thanh tìm kiếm.

Có thể tìm theo:

- Tiêu đề.
- Tên series.
- YouTube URL.
- Tên file Markdown.

Kết quả phù hợp được ưu tiên đưa lên đầu.

Ví dụ:

```text
Search: cold fusion

Kết quả:
1. ColdFusion: ...
2. ...
```

Điểm quan trọng về UX là tìm kiếm không được làm mất các thay đổi đang chỉnh sửa.

Nếu người dùng đã sửa metadata của bài A rồi chuyển sang tìm bài B, dữ liệu đã nhập ở bài A cần được giữ trong trạng thái giao diện.

### 12.3. Select all và chỉnh sửa hàng loạt

Editor hỗ trợ chọn nhiều bài.

Điều này hữu ích khi muốn:

- Đổi series cho một nhóm bài.
- Cập nhật metadata của một loạt bài đã đăng.
- Chỉnh lại YouTube URL hoặc danh mục.
- Chuẩn hóa tags.

Tôi muốn xử lý ít nhất năm bài trong một đợt, nhưng không cần giới hạn việc chỉnh sửa ở đúng năm bài.

### 12.4. Một lần Save, một commit

Đây là quyết định kiến trúc đáng chú ý nhất của Editor.

Một cách triển khai đơn giản là gọi GitHub Contents API riêng cho từng file.

Nếu chỉnh 20 bài, hệ thống có thể tạo ra 20 commit.

Như vậy dễ gây ra nhiều lần kích hoạt build và deploy, làm lịch sử Git trở nên khó theo dõi.

Tôi chọn hướng sử dụng Git Data API để gom tất cả thay đổi.

Quy trình:

```text
Người dùng chỉnh 5–20 bài
              |
              v
      Tạo danh sách file mới
              |
              v
      Lấy HEAD hiện tại
              |
              v
       Tạo Git Tree mới
              |
              v
       Tạo một Commit
              |
              v
     Cập nhật nhánh main
```

Các đối tượng Git chính liên quan gồm:

- Blob: nội dung file.
- Tree: cấu trúc file tại một phiên bản.
- Commit: tham chiếu tới tree và commit cha.
- Ref: con trỏ nhánh, chẳng hạn `main`.

Đây là cách tận dụng bản chất của Git để tối ưu việc xuất bản hàng loạt.

### 12.5. Phòng tránh ghi đè thay đổi mới

Giả sử người dùng mở Editor và bắt đầu chỉnh năm bài.

Trong lúc đó, một quy trình khác vừa tự động đăng thêm một bài mới lên `main`.

Nếu Editor không kiểm tra HEAD, nó có thể xây dựng thay đổi trên dữ liệu cũ.

Vì vậy, trước khi Save cần kiểm tra nhánh có thay đổi hay không.

Nếu HEAD đã thay đổi, cách an toàn là yêu cầu tải lại dữ liệu hoặc xây dựng logic hợp nhất có kiểm soát.

**Bài học:** Batch editing cần kiểm soát xung đột, không chỉ cần một nút Save.

---

## 13. Bước 07 — Image Editor & Gallery: Giải quyết bài toán ảnh cho blog tĩnh

Sau khi hoàn thành pipeline viết bài, tôi tiếp tục nhận ra một điểm thiếu sót.

Một bài viết tốt không nên chỉ có văn bản.

Hình ảnh giúp:

- Chia nhịp đọc.
- Minh họa nội dung.
- Làm bài viết sinh động hơn.
- Tăng khả năng nhận diện.
- Giúp nội dung phù hợp hơn với cách đọc trên thiết bị di động.

Nhưng quản lý hình ảnh trên blog tĩnh lại tạo thêm nhiều thao tác.

Người dùng phải chuẩn bị ảnh, resize, nén, đặt tên, upload lên repository, tìm đường dẫn và chèn Markdown.

Tôi muốn gom các thao tác đó vào một khu vực.

### 13.1. Gallery là thư viện ảnh dùng lại được

Gallery cho phép upload một hoặc nhiều ảnh.

Thay vì đưa file gốc lên GitHub, trình duyệt thực hiện bước xử lý trước.

Quy trình:

```text
Original Image
      |
      v
 Kiểm tra định dạng
      |
      v
  Decode hình ảnh
      |
      v
  Canvas Resize
      |
      v
  Encode WebP
      |
      v
  Preview Gallery
      |
      v
  GitHub Commit
```

Mục tiêu kích thước được thiết lập ở mức tối đa khoảng 1.600px cho cạnh dài nhất.

Việc giữ nguyên tỷ lệ ảnh giúp tránh hiện tượng méo hình.

### 13.2. Vì sao chọn WebP?

WebP phù hợp với blog vì thường cho kích thước file thấp hơn một số định dạng truyền thống trong nhiều tình huống sử dụng.

Kích thước ảnh nhỏ hơn có thể giúp:

- Giảm thời gian tải trang.
- Giảm dung lượng repository.
- Cải thiện trải nghiệm trên mạng di động.
- Hạn chế chuyển những ảnh nguồn quá nặng lên website.

Research Studio sử dụng Canvas API để resize và chuyển đổi sang WebP trên trình duyệt.

Ví dụ:

```javascript
const canvas = document.createElement("canvas");

canvas.width = targetWidth;
canvas.height = targetHeight;

canvas
  .getContext("2d")
  .drawImage(image, 0, 0, targetWidth, targetHeight);

canvas.toBlob(
  blob => {
    // Chuẩn bị file ảnh để lưu
  },
  "image/webp",
  0.82
);
```

Việc xử lý trên trình duyệt giúp giảm nhu cầu xây dựng backend chuyển đổi ảnh.

### 13.3. Gallery không chỉ để upload

Ảnh sau khi được lưu có thể được dùng cho các bài khác.

Điều này tạo ra một lợi ích đáng kể: không cần upload lại cùng một hình ảnh mỗi khi muốn chèn vào bài.

Gallery trở thành một kho tài nguyên có thể tái sử dụng.

Tất nhiên, vẫn cần quản lý tên file, tính duy nhất và tránh lưu nhiều bản sao không cần thiết.

### 13.4. Image Editor sử dụng tư duy từ section 06

Tôi cố gắng duy trì trải nghiệm nhất quán.

Image Editor cũng tải danh sách bài đã commit và có thanh tìm kiếm.

Người dùng có thể:

1. Tìm bài muốn sửa.
2. Chọn ảnh trong Gallery.
3. Chọn một hoặc nhiều bài.
4. Chọn vị trí chèn.
5. Bấm Save.

Ở phiên bản đầu, những vị trí chèn cơ bản gồm đầu nội dung và cuối nội dung.

Đây là thiết kế đơn giản nhưng hữu ích trước khi phát triển các thao tác phức tạp hơn như chèn vào từng H2 hoặc kéo thả trực tiếp trong nội dung.

### 13.5. Upload ảnh và sửa bài trong một commit

Đây là phần kết nối giữa Gallery và tư duy batch editing của section 06.

Nếu người dùng upload năm ảnh rồi chèn chúng vào nhiều bài, hệ thống không nhất thiết phải tạo hàng loạt commit.

Thay vào đó, các blob ảnh và file Markdown được gom vào một Git tree, sau đó tạo một commit.

Kết quả là GitHub Actions không phải được kích hoạt riêng cho từng thao tác.

**Một quyết định kỹ thuật nhỏ ở tầng Git đã cải thiện đáng kể trải nghiệm quản trị nội dung.**

---

## 14. UX của Research Studio: Đừng để hệ thống mạnh trở thành hệ thống khó dùng

Trong quá trình xây dựng, số lượng chức năng tăng nhanh.

Ban đầu chỉ có:

```text
Chọn series
Dán phụ đề
Viết bài
```

Sau đó xuất hiện thêm:

- Gemini.
- Groq.
- Supadata.
- Quota tracking.
- Checkpoint.
- Hàng đợi.
- Smart Insights.
- Editor.
- Gallery.
- Image Editor.
- Lịch sử commit.
- Trạng thái triển khai.

Một trang có quá nhiều thành phần sẽ khiến người dùng cảm thấy nặng nề nếu mọi thứ cùng hiển thị.

Vì vậy, những thay đổi UX nhỏ đã trở nên quan trọng.

### 14.1. Chia giao diện thành các bước đánh số

Research Studio sử dụng cấu trúc tuần tự:

```text
01  Chọn series
02  Phụ đề tiếng Anh
03  Thiết lập chất lượng
04  Viết và xuất bản
05  Xếp hàng · Tiếp tục tự động
06  Editor · Chỉnh sửa bài đã commit
07  Image Editor & Gallery
```

Cấu trúc này giúp người dùng nhận ra luồng chính và những công cụ quản trị bổ sung.

### 14.2. Mặc định thu gọn các chức năng ít dùng

Section 06 và 07 có rất nhiều trường, danh sách và nút điều khiển.

Nhưng người dùng không cần mở Editor mỗi lần chỉ muốn viết bài mới.

Vì vậy, tôi chuyển hai section này sang trạng thái mặc định thu gọn.

Khi cần, nhấn mũi tên để mở.

Đây là một ứng dụng của nguyên tắc *progressive disclosure*: chỉ hiện những gì cần thiết ở thời điểm hiện tại.

### 14.3. Đưa nút Save đến nơi người dùng cần

Ban đầu, nút Save của Editor nằm ở cuối danh sách.

Nếu có nhiều bài, người dùng phải cuộn rất xa mới tìm được.

Tôi chuyển Save lên phía trên bên phải.

Lợi ích không nằm ở việc giao diện đẹp hơn một chút.

Nó giúp thao tác chính dễ tìm và dễ dự đoán hơn.

### 14.4. Mỗi section chỉ nên phục vụ một mục tiêu rõ ràng

Từ quá trình phát triển, tôi rút ra một nguyên tắc:

- Section 01–03: chuẩn bị đầu vào.
- Section 04: bắt đầu xử lý.
- Section 05: theo dõi và quản lý hàng đợi.
- Section 06: chỉnh sửa metadata.
- Section 07: quản lý và chèn hình ảnh.

Khi trách nhiệm của từng phần rõ ràng, việc mở rộng sản phẩm cũng dễ kiểm soát hơn.

---

## 15. Những lỗi thực tế giúp tôi hiểu hệ thống sâu hơn

Một dự án không trở nên vững chắc chỉ vì có nhiều tính năng.

Nó trưởng thành qua việc phát hiện và khắc phục những tình huống thực tế.

Trong quá trình xây dựng Research Studio, tôi đã gặp nhiều vấn đề đáng nhớ.

### 15.1. Model AI không còn khả dụng

Một model được cấu hình trước đó có thể ngừng hỗ trợ.

Giải pháp không chỉ là thay tên model trong mã nguồn.

Điều cần xây dựng là cơ chế kiểm tra model và xử lý khi một model không còn khả dụng.

### 15.2. Gemini hết quota nhưng Groq không hoạt động

Fallback đôi khi không được kích hoạt đúng điều kiện hoặc provider dự phòng cũng thất bại.

Tôi học được rằng cần tách:

- Trạng thái xác thực.
- Trạng thái model.
- Trạng thái request.
- Trạng thái quota.
- Trạng thái chuyển provider.

Một dấu tích “Connected” không thể bảo đảm mọi request tạo nội dung sẽ thành công.

### 15.3. Trang tải lại khi bài đang viết

Nếu không có checkpoint, reload có thể khiến toàn bộ phiên bị mất.

Việc khôi phục tự động phải được xây dựng từ mô hình trạng thái rõ ràng.

### 15.4. Queue tạo trùng task

Hai URL khác nhau có thể trỏ đến cùng video.

Giải pháp là so sánh định danh nội dung, không chỉ so sánh chuỗi đầu vào.

### 15.5. Giao diện hiển thị sai hành vi của nút

Một thời điểm, nút “Viết nghiên cứu & đăng bài” đổi thành “Thêm vào hàng đợi” khi có bài đang chạy.

Tôi quyết định khôi phục nhãn gốc.

Logic điều phối nằm bên trong hệ thống, không nhất thiết phải làm thay đổi ý định được thể hiện trên nút.

### 15.6. Hàng loạt chỉnh sửa tạo quá nhiều commit

Nếu mỗi lần thay đổi metadata hoặc upload ảnh đều tạo một commit, hệ thống sẽ trở nên thiếu hiệu quả.

Batch commit giúp giảm số lần kích hoạt quy trình deploy và làm lịch sử Git dễ theo dõi hơn.

### 15.7. Rollback có thể bị workflow tự động đảo ngược

Đây là một bài học quan trọng hơn cả lỗi giao diện.

Một hệ thống có automation tự tạo hoặc tự merge pull request có thể vô tình đưa những thay đổi cũ quay lại sau khi rollback.

Điều này cho thấy rollback không chỉ là vấn đề chọn lại commit cũ.

Cần hiểu toàn bộ luồng CI/CD, branch, pull request và cơ chế auto-merge trước khi thực hiện thay đổi lớn.

---

## 16. Những giới hạn tôi vẫn cần giải quyết

Tôi không muốn mô tả Research Studio như một sản phẩm đã hoàn thiện tuyệt đối.

Đây là một hệ thống đang được xây dựng và cải tiến liên tục.

Một số giới hạn kỹ thuật vẫn rất đáng chú ý.

### 16.1. Chưa có worker backend hoạt động liên tục

Khi trình duyệt đóng, JavaScript không thể tiếp tục chạy như một dịch vụ nền.

Checkpoint giúp khôi phục, nhưng không thay thế một worker phía máy chủ.

### 16.2. Queue và checkpoint phụ thuộc vào thiết bị

localStorage phù hợp để xây dựng ứng dụng nhẹ, nhưng không tự động đồng bộ giữa nhiều máy.

Muốn quản lý hàng đợi đa thiết bị thực sự, cần một nơi lưu trạng thái chung.

### 16.3. API key phía trình duyệt

Ứng dụng gọi API trực tiếp từ trình duyệt cần được thiết kế rất cẩn thận.

Không nên đưa API key vào repository công khai.

Việc sử dụng sessionStorage giúp tránh hardcode key, nhưng không tương đương với cơ chế bảo mật của backend.

Về lâu dài, một lớp proxy có xác thực và giới hạn quyền sẽ an toàn hơn cho các tác vụ nhạy cảm.

### 16.4. Trùng URL chưa phải chống trùng toàn hệ thống

Việc phát hiện trùng trong hàng đợi cục bộ là bước đầu.

Để chống trùng toàn diện, hệ thống cần so sánh thêm với:

- Các bài đã xuất bản.
- Task trên thiết bị khác.
- Nguồn có URL biến thể.
- Những video từng được xử lý nhưng chưa commit.

### 16.5. Batch commit vẫn có rủi ro xung đột

Nếu nhánh `main` thay đổi trong lúc đang chỉnh sửa, thao tác lưu cần xử lý an toàn.

Kiểm tra HEAD giúp phát hiện một số xung đột, nhưng chưa thay thế được cơ chế hợp nhất nội dung ở mức trường dữ liệu.

### 16.6. Chất lượng nội dung cần kiểm chứng độc lập

AI có thể diễn đạt trôi chảy nhưng vẫn hiểu sai một phát ngôn hoặc một số liệu.

Những bài nghiên cứu quan trọng cần có bước đối chiếu nguồn độc lập, nhất là các chủ đề thời sự, chính sách, khoa học và kinh tế.

---

## 17. Nếu xây dựng lại Research Studio từ đầu, tôi sẽ làm gì khác?

Sau quá trình phát triển, tôi nhận ra một số quyết định nên được thực hiện ngay từ đầu.

### 17.1. Thiết kế state machine trước

Thay vì để trạng thái xử lý hình thành dần từ nhiều biến và điều kiện, tôi sẽ định nghĩa rõ:

```text
IDLE
  |
  v
VALIDATING
  |
  v
RESEARCHING
  |
  v
OUTLINING
  |
  v
WRITING
  |
  v
EDITING
  |
  v
PUBLISHING
  |
  v
COMPLETED
```

Các trạng thái phụ:

```text
WAITING_QUOTA
PAUSED
FAILED
CANCELLED
```

Mỗi trạng thái cần quy tắc chuyển tiếp và phục hồi rõ ràng.

Điều này đặc biệt quan trọng khi hệ thống có queue và fallback.

### 17.2. Tách các module sớm hơn

Khi code phát triển nhanh, việc đặt quá nhiều logic trong một file sẽ làm bảo trì khó khăn.

Một kiến trúc rõ ràng hơn có thể gồm:

```text
research-studio/
  src/
    transcript/
    providers/
    pipeline/
    checkpoints/
    queue/
    publishing/
    editor/
    gallery/
    metrics/
```

Cách tổ chức này giúp kiểm thử và thay đổi từng thành phần mà ít ảnh hưởng đến các phần khác.

### 17.3. Viết test cho các trường hợp nguy hiểm

Tôi sẽ ưu tiên những test như:

- Hai URL khác nhau nhưng cùng YouTube Video ID.
- Reload khi đang viết H2 thứ năm.
- Gemini trả 429.
- Groq cũng trả lỗi.
- Commit thành công nhưng request timeout.
- Hai task cùng lúc muốn commit.
- Queue còn task nhưng credentials hết hiệu lực.
- Editor đang sửa thì `main` thay đổi.
- Gallery upload ảnh trùng.
- Một ảnh đã có trong bài bị chèn lần thứ hai.

Những test này có giá trị thực tế hơn nhiều so với chỉ kiểm tra giao diện có hiển thị đúng hay không.

### 17.4. Xây dựng observability ngay từ đầu

Một bảng trạng thái kỹ thuật nên ghi được:

```text
Task ID
Provider
Model
Current Step
Completed Sections
Retry Count
Queue Position
Last Checkpoint
Commit SHA
Deploy Status
```

Khi gặp lỗi, người dùng không cần tự suy đoán hệ thống đang làm gì.

### 17.5. Tách publish khỏi generation

Về lâu dài, tôi muốn tách rõ hai giai đoạn:

**Generate:** tạo và kiểm tra nội dung.

**Publish:** xác nhận nội dung hợp lệ, ghi GitHub và theo dõi trạng thái triển khai.

Điều này giúp tránh việc retry AI vô tình kích hoạt lại bước xuất bản đã thành công.

---

## 18. Bảy nguyên tắc tôi rút ra sau khi xây dựng Research Studio

### Nguyên tắc 1: Automation phải có trạng thái

Một chuỗi request không tự động trở thành một hệ thống vận hành đáng tin.

Muốn phục hồi, cần biết chính xác đang ở đâu.

### Nguyên tắc 2: Không được làm mất công việc đã hoàn tất

Đây là lý do checkpoint quan trọng.

Nếu sáu phần đã hoàn thành, lỗi ở phần thứ bảy không nên buộc hệ thống bắt đầu lại từ đầu.

### Nguyên tắc 3: Queue là cơ chế kiểm soát tải, không chỉ là danh sách chờ

FIFO giúp điều phối công việc, giảm request đồng thời và hỗ trợ trải nghiệm chuẩn bị nhiều bài liên tiếp.

### Nguyên tắc 4: Nhiều provider không tự động đồng nghĩa với độ tin cậy cao

Fallback cần kiểm tra điều kiện, xác thực thực tế và xử lý lỗi cụ thể của từng nhà cung cấp.

### Nguyên tắc 5: Git có thể là một phần của kiến trúc sản phẩm

GitHub không chỉ là nơi lưu code.

Khi được sử dụng đúng cách, Git có thể cung cấp version history, bằng chứng thay đổi và cơ chế batch commit hiệu quả cho website tĩnh.

### Nguyên tắc 6: UX tốt thường đến từ những thay đổi rất nhỏ

Một textarea thấp hơn, một nút Save chuyển lên phía trên, một thanh search hay một section mặc định thu gọn có thể cải thiện trải nghiệm rõ rệt.

### Nguyên tắc 7: Phải phân biệt điều hệ thống đã làm với điều hệ thống được kỳ vọng sẽ làm

API trả kết quả không đồng nghĩa nội dung đúng.

Commit thành công không đồng nghĩa trang đã live.

Fallback được cấu hình không đồng nghĩa fallback chắc chắn thành công.

Checkpoint đã lưu không đồng nghĩa công việc có thể chạy khi trình duyệt đóng.

Những ranh giới này giúp sản phẩm đáng tin cậy hơn.

---

## 19. Research Studio thực sự đặc biệt ở điểm nào?

Nếu chỉ nhìn từng tính năng riêng lẻ, chúng không phải những công nghệ chưa từng tồn tại.

AI tạo bài viết đã phổ biến.

Hàng đợi FIFO là khái niệm lâu đời.

GitHub API đã có sẵn.

Canvas có thể xử lý ảnh ngay trên trình duyệt.

Hugo là một static site generator quen thuộc.

**Điểm tạo nên sự khác biệt là cách kết hợp các thành phần này để giải quyết một quy trình làm việc cụ thể.**

Research Studio kết nối:

```text
Nguồn video
    ↓
Phụ đề
    ↓
Nghiên cứu
    ↓
Dàn ý
    ↓
Viết từng phần
    ↓
Biên tập
    ↓
Kiểm tra chất lượng
    ↓
Lưu checkpoint
    ↓
Xếp hàng công việc
    ↓
Commit GitHub
    ↓
Hugo deploy
    ↓
Chỉnh sửa metadata
    ↓
Quản lý hình ảnh
```

Người dùng không còn phải vận hành từng công cụ riêng lẻ.

Họ chỉ cần cung cấp nguồn và khởi tạo yêu cầu. Những bước còn lại được hệ thống điều phối trong phạm vi khả năng của nó.

Tôi đặc biệt thích việc công cụ này không bắt buộc phải được xây dựng bằng một hệ thống máy chủ lớn.

Nó được phát triển ngay bên trong một blog cá nhân, trên nền tảng Hugo và GitHub Pages.

Điều đó cho thấy một dự án nhỏ vẫn có thể mang tư duy kiến trúc của những hệ thống lớn hơn: quản lý trạng thái, retry, queue, kiểm tra đầu ra, version control và batch processing.

---

## 20. Kết luận: Từ người viết blog thành người thiết kế quy trình xuất bản

Khi bắt đầu xây dựng BlogNaver, tôi chỉ muốn có một nơi lưu trữ bài viết và chia sẻ những điều mình quan tâm.

Nhưng khi tự động hóa quá trình nghiên cứu và xuất bản, tôi nhận ra mình đang làm một việc khác.

Tôi không chỉ viết blog.

Tôi đang thiết kế một quy trình biến dữ liệu thô thành nội dung có cấu trúc, đưa nội dung đó lên website và duy trì khả năng quản lý sau khi xuất bản.

Research Studio vì thế không đơn thuần là một tính năng “Viết blog bằng AI”.

Nó là một dự án giúp tôi hiểu sâu hơn về:

- Cách chia nhỏ một tác vụ AI dài.
- Cách quản lý tiến độ và khôi phục.
- Cách thiết kế queue cho công việc bất đồng bộ.
- Cách xử lý API quota và fallback.
- Cách dùng GitHub như một tầng xuất bản.
- Cách giảm số lần commit và deploy.
- Cách xây dựng công cụ biên tập metadata.
- Cách tối ưu ảnh cho website tĩnh.
- Và cách cải thiện UX từ những bất tiện rất nhỏ trong quá trình sử dụng.

Có lẽ điều khiến tôi hài lòng nhất không phải là số lượng tính năng.

Mà là việc mỗi tính năng mới đều ra đời từ một vấn đề thực tế tôi gặp phải khi vận hành blog.

Bài đang viết bị lỗi? Tôi xây checkpoint.

Có quá nhiều video cần xử lý? Tôi xây queue.

YouTube URL bị trùng? Tôi bổ sung chuẩn hóa Video ID.

Model AI hết quota? Tôi nghiên cứu fallback.

GitHub nhận quá nhiều commit? Tôi chuyển sang batch commit.

Bài đã đăng cần sửa metadata? Tôi xây Editor.

Ảnh quá lớn và khó chèn? Tôi xây Gallery và Image Editor.

Giao diện ngày càng dài? Tôi thu gọn các section và sắp xếp lại thao tác.

**Đó cũng là kinh nghiệm lớn nhất tôi muốn lưu lại: đừng xây tính năng chỉ vì công nghệ cho phép. Hãy xây tính năng vì nó loại bỏ một trở ngại thực tế trong quy trình làm việc.**

Research Studio chắc chắn vẫn còn nhiều điểm cần hoàn thiện.

Nhưng với tôi, nó đánh dấu bước chuyển quan trọng của BlogNaver: từ một website đăng bài tĩnh thành một môi trường nghiên cứu, biên tập và xuất bản nội dung có khả năng tự động hóa.

Và đây mới là nền tảng cho những cải tiến tiếp theo.

---

### Thông tin dự án

**Tên công cụ:** BlogNaver Research Studio — Tạo Series Post

**Website:** https://duynguyenaver.github.io/blognaver/tien-ich/tao-series-post/

**Repository:** https://github.com/duynguyenaver/blognaver

**Công nghệ:** Hugo, GitHub Pages, JavaScript, Gemini API, Groq API, Supadata API, GitHub REST API, Canvas API, WebP, localStorage và sessionStorage.

**Chủ đề:** AI Engineering, Content Automation, Static Site Architecture, GitHub API, Technical Blogging.

**Ghi chú:** Bài viết phản ánh kiến trúc và những tính năng được xây dựng trong mã nguồn tại thời điểm ghi chép. Một số cơ chế, đặc biệt là fallback AI, khôi phục phiên, biên tập hàng loạt và cập nhật hình ảnh, vẫn cần được kiểm thử thường xuyên trong môi trường production.
