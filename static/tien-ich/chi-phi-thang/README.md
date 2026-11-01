# Chi phí tháng · Google Sheets → encrypted dashboard

Source of truth: existing private spreadsheet chiphithang in the provided Google Drive folder. The site is under /blognaver/tien-ich/chi-phi-thang/ and does not edit the original spreadsheet.

Tab chiphithang (A:H): Ngày | Loại | Danh mục | Nội dung | Số tiền (VND) | Phương thức | Ghi chú | Mã giao dịch.
- Ngày: YYYY-MM-DD. Loại: Chi or Thu. Amount: whole-number positive VND.
- Optional Mã giao dịch is a stable unique transaction identifier.
Tab ngansach (A:C): Tháng (YYYY-MM) | Ngân sách (VND) | Ghi chú.
- One text month per row (example: 2026-11). No fabricated starter transactions.

Activation: 1) Find the service-account client_email in the pre-existing repository Actions secret VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON and share this private spreadsheet to that service account as Viewer. 2) Add repository Actions secret MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE (at least 16 characters, strong and unique). Keep a private copy: the user enters this same passphrase in the website to decrypt. 3) Verify existing owner PAT in BLOGNAVER_VOCAB_BOT_TOKEN has Contents/Pull requests permissions. 4) Run the workflow Monthly expenses · Private Google Sheets encrypted sync manually once. It subsequently checks every 15 minutes (GitHub schedule/CI/deploy can be delayed). Do not put keys in repository code, front-end, logs or sheet.

GitHub Actions reads private Google Sheets using service-account OAuth, validates headers, reads complete transaction and budget rows, and encrypts with AES-256-GCM (PBKDF2-SHA256 / 310000 iterations). It commits ciphertext only in data.enc.json via feature branch → PR → CI → merge → Pages deploy. Browser WebCrypto decrypts locally. Passphrase opt-in remembrance uses existing BNDeviceSecrets IndexedDB device vault. This vault protects data at rest on a trusted device, but malicious same-origin JavaScript can still access it. GitHub Pages cannot read private Sheets or update the sheet directly. Refresh checks only the latest deployed encrypted snapshot.

On invalid source data or missing secrets, fail closed; keep last successfully published ciphertext. SHA256 sourceHash in public envelope leaks only whether snapshot input changed; it is not a secrecy mechanism. Existing manual tracker /chi-tieu-thang/ remains unchanged.

Check: python3 scripts/test-sync-monthly-expenses.py -v; node --check static/tien-ich/chi-phi-thang/app.js.
