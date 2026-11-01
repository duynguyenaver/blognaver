# Đơn xin việc / 입사지원서

Trang: https://duynguyenaver.github.io/blognaver/tien-ich/don-xin-viec/
Alias: https://duynguyenaver.github.io/blognaver/tien-ich/donxinviec/
Google Sheet gốc: https://docs.google.com/spreadsheets/d/17PL7m0_NTkZdWzptHkVewuqPcnTHul5KFIeT0MCHd0A/edit

## Thiết kế từ PDF Samsung

Sử dụng bố cục trang 2–5, không sử dụng trang 1 (thỏa thuận dữ liệu cá nhân). Bốn trang A4 gồm:
1. 인적사항 / 학력사항 / 경력사항 / 자격사항 / 어학사항 / 특기사항.
2. 석, 박사과정 중 연구경력 và 논문/특허/수상내역 목록.
3. 경력 사항 기술: từng công ty, thời gian, nhiệm vụ chi tiết và thành tựu.
4. 추가 기재 사항: nội dung bổ sung tự do.

Đây là template lấy cảm hứng từ mẫu Samsung, không phải biểu mẫu được Samsung chứng thực.
Khi in chọn Background graphics để giữ màu nền cyan và xám.

## Tab Google Sheets

CV: mỗi nhãn ở cột A, điền tại cột B (không đổi các nhãn ở cột A).
HocVan: một hàng / văn bằng, học vị, luận văn và lab.
KinhNghiem: một hàng / công ty hoặc giai đoạn; có mô tả công việc và thành tựu.
ChungChi: một hàng / giấy phép hoặc chứng chỉ.
NgoaiNgu: một hàng / bài thi ngoại ngữ.
NghienCuu: một hàng / đề tài nghiên cứu.
ThanhTuu: một hàng / công trình, bằng sáng chế, giải thưởng.
BoSung: một hàng / tiêu đề và nội dung tự do.

Không thay đổi tên tab hoặc header. Thêm, sửa, xóa dữ liệu ở mọi tab đều ảnh hưởng bản đồng bộ.

## Google Service Account · Thiết lập một lần

1. Google Cloud Console → tạo Project → enable Google Sheets API.
2. Tạo Service Account riêng với quyền tối thiểu; tạo file JSON key và KHÔNG commit vào repo, không dán lên chat hoặc trình duyệt.
3. Mở đúng Google Sheet nguồn, Share → thêm email của Service Account với quyền Viewer. Quyền Anyone with link không thay thế bước chia sẻ cụ thể này.
4. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   * DONXINVIEC_SERVICE_ACCOUNT_JSON = nội dung JSON key đầy đủ.
   * DONXINVIEC_ENCRYPTION_PASSPHRASE = mật khẩu dài riêng biệt (tối thiểu 16 ký tự, nên >= 24 ký tự ngẫu nhiên).
   * BLOGNAVER_VOCAB_BOT_TOKEN = token owner đã sử dụng trong repo, cần Contents:write và Pull requests:write.
5. Sau khi merge PR tính năng, Actions → Đơn xin việc · Service Account encrypted Sheets sync → Run workflow. Không cần Apps Script.

## Cơ chế đồng bộ và riêng tư

GitHub Actions đọc toàn bộ 8 tab bằng Google Sheets API với Service Account và kiểm tra mỗi khoảng 5 phút; cron có thể trễ. Website tự kiểm tra snapshot mỗi 45 giây khi tab đang mở, nhưng không phải đồng bộ tức thì.

Mọi chỉnh sửa ở bất kỳ ô dữ liệu được ánh xạ nào làm đổi source hash và sinh snapshot mới. Dữ liệu trước khi lưu lên GitHub được mã hóa AES-256-GCM bằng khóa PBKDF2-SHA256 310.000 vòng. Không ghi dữ liệu CV rõ, service account JSON hay passphrase vào repository. Web chỉ giải mã bằng Web Crypto ở trình duyệt.

Script luôn tạo branch / PR cho snapshot mới, không commit trực tiếp main; PR auto-merge theo rules. Khi thiếu secret, không thể đọc sheet hoặc sai header, Actions báo lỗi và không thay snapshot cũ.

Repo là public: ciphertext vẫn tải được và có nguy cơ tấn công đoán mật khẩu ngoại tuyến. Hãy dùng mật khẩu mạnh, duy nhất. Người có mật khẩu giải mã sẽ xem được hồ sơ, bao gồm địa chỉ hoặc ngày sinh được điền.

## Chạy kiểm thử

python3 -m unittest discover -s scripts -p 'test-sync-don-xin-viec.py' -v
node --check static/tien-ich/don-xin-viec/app.js

Nếu dữ liệu dài hơn 1 trang, khi in có thể tự tràn sang trang bổ sung; độ khớp chính xác phụ thuộc nội dung.
