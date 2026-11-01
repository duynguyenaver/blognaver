# Chi phí tháng · Google Apps Script (không cần Service Account)

Website: https://duynguyenaver.github.io/blognaver/tien-ich/chi-phi-thang/

**Bảng nguồn riêng tư:** [chiphithang](https://docs.google.com/spreadsheets/d/1gxikPCOe62Be2_Lp5n3m6HMfCdnh-8WT5apJZeEvM7E/edit), thuộc thư mục Google Drive của chủ sở hữu.

### Kiến trúc
Sheet riêng tư → Google Apps Script (chạy với tài khoản chủ Sheet) → HTTPS POST có token bí mật → GitHub Actions → kiểm tra cột, mã hóa AES-256-GCM → nhánh dữ liệu → PR → CI → deploy GitHub Pages → Dashboard giải mã cục bộ bằng WebCrypto.

Không có quyền Viewer cho Service Account, không xuất bản Google Sheets kiểu Anyone-with-link, không gửi dữ liệu ở URL hay commit dưới dạng plaintext.

### Thiết lập một lần, theo thứ tự

1. Vào bảng tính nguồn, **Extensions → Apps Script**. Dán **nguyên nội dung** file [MonthlyExpenses.gs](../../../docs/google-apps-script/MonthlyExpenses.gs) vào file Code.gs của Apps Script (không dán vào Google Sheets), Save.
2. Apps Script → **Project Settings (biểu tượng bánh răng) → Script properties**:
   - \`FINANCE_SYNC_TOKEN\` = chuỗi ngẫu nhiên **ít nhất 32 ký tự**, ví dụ được tạo bởi password manager. Đây là token xác thực bridge **khác với mật khẩu dashboard**. Không chia sẻ token.
   - (Tùy chọn) \`GITHUB_DISPATCH_TOKEN\` = PAT của GitHub chủ repo, cho phép Actions: read/write. Dùng để phát lệnh đồng bộ tức thời khi sửa hai tab. Nếu không có, GitHub Actions vẫn kiểm tra định kỳ 15 phút.
3. Trong Apps Script bấm **Deploy → New deployment → Web app**, chọn:
   - Execute as: **Me** (chủ Sheet).
   - Who has access: **Anyone** (để runner GitHub gọi từ ngoài tài khoản Google). Web app không lộ bản ghi khi GET và từ chối POST không có token đúng. Nếu tổ chức cấm Anyone, kiến trúc này không chạy được; không chuyển Sheet thành công khai.
   - Deploy, cấp quyền cho script, copy URL kết thúc bằng **\`/exec\`**.
4. GitHub repo → **Settings → Secrets and variables → Actions**:
   - **Variables → New repository variable**: \`MONTHLY_EXPENSES_APPS_SCRIPT_URL\` = URL \`/exec\` ở bước 3.
   - **Secrets → New repository secret**: \`MONTHLY_EXPENSES_APPS_SCRIPT_TOKEN\` = giá trị \`FINANCE_SYNC_TOKEN\` ở bước 2. Đây là cùng một token. Không nhập token vào source code hoặc bình luận.
   - **Secrets → New repository secret**: \`MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE\` = mật khẩu riêng **ít nhất 16 ký tự**. Giá trị này dùng **chỉ trong runner khi mã hóa** và **trong dashboard khi bạn nhập để giải mã**. Không đặt trùng token bridge.
   - GitHub token bot \`BLOGNAVER_VOCAB_BOT_TOKEN\` của hệ thống PR đã có sẵn phải có quyền tạo nhánh, PR và yêu cầu auto-merge.
5. GitHub → Actions → **Monthly expenses · Private Google Sheets encrypted sync** → **Run workflow** trên \`main\` để tạo bản mã đầu tiên. Sau khi PR dữ liệu green CI, merge và Pages deploy xong, vào dashboard \`/tien-ich/chi-phi-thang/\`, nhập \`MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE\`. Dữ liệu hiện chưa có giao dịch nếu bạn chưa nhập hàng nào.
6. (Tùy chọn) Trong Apps Script chọn hàm \`installMonthlyExpensesTriggers\` → **Run** → cấp quyền. Triggers được tạo với quyền của bạn; khi sửa tab \`chiphithang\` / \`ngansach\`, nếu có \`GITHUB_DISPATCH_TOKEN\` thì gửi lệnh kích hoạt GitHub workflow, có chống lặp tối thiểu 60 giây. Có menu **Chi phí tháng → Đồng bộ ngay**. Không bắt buộc; lịch chạy GitHub vẫn hoạt động.

**LƯU Ý:** Apps Script project có thể xem và sửa bởi người có quyền chỉnh sửa Apps Script. Chỉ cấp quyền biên tập Sheet/script cho tài khoản đáng tin. Deployment endpoint truy cập Internet nhưng nội dung được bảo vệ bằng token ngẫu nhiên 32+ ký tự; ai có được token có thể yêu cầu xem dữ liệu. Không ghi token vào URL, ô Sheet hoặc public repo; nếu bị lộ, thay ngay tại 2 chỗ và deploy lại nếu cần.

### Cấu trúc bảng

Tab \`chiphithang\` (A:H): Ngày | Loại | Danh mục | Nội dung | Số tiền (VND) | Phương thức | Ghi chú | Mã giao dịch.
- Ngày: YYYY-MM-DD (cột Google Sheets đã có format \`yyyy-mm-dd\`); Loại là \`Thu\` hoặc \`Chi\`; số tiền VND nguyên dương.
- ID giao dịch là tùy chọn, phải khác nhau nếu nhập.
Tab \`ngansach\` (A:C): Tháng (YYYY-MM) | Ngân sách (VND) | Ghi chú. Mỗi tháng một dòng, dạng văn bản \`2026-11\`.

### Chính sách bảo vệ dữ liệu

- Mọi giao dịch/ghi chú chỉ ở Google Sheets nguồn; pipeline trả nội dung có token qua HTTPS và **mã hóa trong bộ nhớ** ở GitHub Actions. Bản xuất bản trên repository **chỉ là ciphertext** AES-256-GCM với PBKDF2-SHA256, salt/nonce ngẫu nhiên; password không được lưu vào repo.
- GitHub Actions jobs và Google Apps Script đều có quyền xử lý dữ liệu thu chi dạng rõ ở bộ nhớ tại thời điểm chạy; chính sách không có nghĩa dữ liệu không bao giờ đi qua máy chủ Google/GitHub.
- HTTP GET vào Web app chỉ trả lời tình trạng service; POST sai token trả lỗi chung, không chứa dữ liệu. Không dùng JSONP hoặc public Sheet export.
- Giao diện GitHub Pages chỉ giải mã trong trình duyệt bằng WebCrypto, tùy chọn nhớ mật khẩu bằng vault \`BNDeviceSecrets\`. Same-origin script bị xâm nhập vẫn có thể truy cập dữ liệu đang mở.
- Bảng sai schema hoặc truy cập lỗi: pipeline thất bại an toàn, giữ bản ciphertext cuối cùng. Tệp plaintext không được lưu vào git.
- Snapshot cần PR → CI → merge → Pages deploy; lịch GitHub mỗi 15 phút không phải cập nhật tức thời. Nút Refresh trên trang chỉ đọc bản mã đã triển khai.

### Kiểm tra

\`python3 scripts/test-sync-monthly-expenses.py -v\`
\`node --check static/tien-ich/chi-phi-thang/app.js\`
\`node -e "new Function(require('fs').readFileSync('docs/google-apps-script/MonthlyExpenses.gs','utf8'))"\`

Không thay đổi tiện ích nhập liệu thủ công \`/chi-tieu-thang/\`.
