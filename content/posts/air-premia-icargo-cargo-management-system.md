---
title: "Air Premia và iCargo: bộ não số phía sau một hãng hàng không hybrid"
date: 2026-10-29T14:35:00+07:00
draft: false
description: "Bài 1/5 mở cánh cửa vào hệ thống Cargo Management System: vì sao cargo cần hệ thống riêng, iCargo xử lý dữ liệu gì và giới hạn của những điều có thể khẳng định về nội bộ Air Premia."
slug: "air-premia-icargo-cargo-management-system"
categories: ["Hàng không", "Công nghệ"]
tags: ["Air Premia", "Air Cargo", "iCargo", "Logistics", "Cargo Management"]
---

![Air Premia và iCargo: bộ não số phía sau một hãng hàng không hybrid](https://cdn.imweb.me/upload/S201810085bbafdbe98c6c/20a84695e8227.png)

*Ảnh: Air Premia – hoạt động xếp container hàng dược phẩm trên Boeing 787.*

> **Series Air Premia Cargo — Kỳ 1/5.** Bài 1/5 mở cánh cửa vào hệ thống Cargo Management System: vì sao cargo cần hệ thống riêng, iCargo xử lý dữ liệu gì và giới hạn của những điều có thể khẳng định về nội bộ Air Premia.

## Khi một chiếc Boeing 787 chở cả người và hàng

Một hãng hàng không hybrid như Air Premia bán ghế cho hành khách, nhưng cũng có thể khai thác năng lực hầm hàng (*belly cargo*) trong những chuyến bay ấy. Hai dòng sản phẩm cùng dùng một máy bay nhưng không có cùng hệ thống nghiệp vụ. Vé hành khách được quản lý theo PNR, hạng đặt chỗ, vé điện tử và điều kiện giá; vận tải hàng hóa lại đi theo lô hàng, trọng lượng, thể tích, vận đơn, khai báo an ninh và hành trình giao nhận.

Vì thế, **Cargo Management System (CMS)** không phải một màn hình bổ sung vào hệ thống đặt vé. Nó là lớp điều phối giao dịch, trạng thái và tài nguyên của nghiệp vụ logistics hàng không.

## Air Premia sử dụng hệ thống nào? Một dữ kiện đã được xác nhận

Ngày 6/7/2022, IBS Software thông báo Air Premia đưa **iCargo** vào vận hành. Phạm vi mà nhà cung cấp công bố gồm iCargo Sales and Operations và khả năng hỗ trợ thủ tục hải quan Mỹ; các chức năng được nêu đích danh là reservation, capacity allocation, quản lý AWB stock, danh mục dịch vụ, xử lý gián đoạn, acceptance và load planning.

Đây là bằng chứng về **việc triển khai giải pháp**, không phải bằng chứng rằng tất cả module thương mại của iCargo đều được Air Premia bật hoặc mọi quy trình kho đều do hãng tự vận hành. Phạm vi triển khai và sơ đồ tích hợp nội bộ chi tiết không được công bố đầy đủ.

## Sáu lớp nghiệp vụ của một Cargo CMS

### 1. Sales và Reservation

Hãng nhận yêu cầu đặt hàng từ forwarder hoặc đại lý: tuyến, ngày bay, loại hàng, số kiện, gross weight, kích thước, điều kiện nhiệt độ hoặc DG. Hệ thống đối chiếu yêu cầu với tải cung ứng còn có thể bán. Không nên hiểu “còn tải” chỉ là còn bao nhiêu kg: hạn chế kích thước cửa hầm, vị trí ULD, kết cấu và tải hữu dụng thực tế đều liên quan.

### 2. Inventory và Capacity Control

Khả năng cung ứng được chia theo chặng, sản phẩm, thời gian và mức cam kết. Khi lịch bay đổi hoặc khối lượng khai thác thay đổi, khả năng nhận hàng cũng phải cập nhật. Đặt chỗ thành công không đồng nghĩa lô hàng đã được nhận tại kho hay chắc chắn lên đúng chuyến ban đầu.

### 3. AWB và Shipment Data

AWB liên kết người gửi, người nhận, nơi đi/đến, mô tả hàng, số kiện, trọng lượng và điều khoản vận chuyển. Các thao tác sửa dữ liệu có thể kéo theo đối chiếu booking, thông tin forwarder, thông quan và dữ liệu hãng.

### 4. Cargo Acceptance và Operation

Tại kho, hàng được kiểm tra chứng từ, cân đo, tình trạng đóng gói và điều kiện tiếp nhận. Hàng không đạt chuẩn có thể bị giữ lại dù đã có booking. Hệ thống ghi nhận mốc trạng thái để các bên liên quan biết hàng thực sự ở bước nào.

### 5. Load Planning và Irregularity

Không gian belly cargo là tài nguyên hữu hạn của mỗi chuyến. Một lô hàng bị offload có thể ảnh hưởng danh sách hàng thực bay, AWB, thông báo trạng thái, giá trị doanh thu và dự kiến giao hàng. CMS cần lưu lịch sử thay đổi có thể truy vết.

### 6. Tài chính và báo cáo

Một nền tảng Cargo hiện đại có thể tích hợp rating, invoicing, revenue accounting và báo cáo. Tuy nhiên, không nên suy luận rằng mọi báo cáo tài chính của Air Premia đều chạy trực tiếp trong iCargo; kết nối với ERP và công cụ kế toán tùy kiến trúc riêng.

## Bước tiến 2026: Cổng Cargo tự phục vụ

Thông cáo chính thức ngày 22/4/2026 cho biết Air Premia nâng cấp trang Cargo, hỗ trợ **đặt chỗ, xem/sửa booking và theo dõi các giai đoạn vận chuyển qua web và mobile**; hãng xác nhận tích hợp API với iCargo. Điểm đáng chú ý ở đây là thay đổi trải nghiệm người dùng: forwarder có thể tự thực hiện nhiều thao tác thay vì hỏi nhân viên qua email.

Có thể hình dung kiến trúc tổng quát là *cổng khách hàng → API → hệ thống Cargo → tác nghiệp sân bay/kho → dữ liệu trạng thái trở lại cổng*. Đây là sơ đồ giải thích, **không phải tài liệu kiến trúc nội bộ Air Premia**.

## Bài học về chuyển đổi số hàng không

Điều làm nên giá trị của CMS không chỉ là “số hóa vận đơn”. Giá trị nằm ở việc cùng một lô hàng được ghi nhận nhất quán từ yêu cầu đặt chỗ đến lúc giao hàng, dù dữ liệu đi qua forwarder, hãng bay, GHA và cơ quan quản lý.

Ở kỳ tiếp theo, chúng ta theo chân một shipment từ yêu cầu báo giá đến booking và e-AWB.

## Nguồn và giới hạn xác minh

- [IBS Software, thông báo iCargo vận hành tại Air Premia (06/07/2022)](https://www.ibsplc.com/news/air-premia-airlines-goes-live-with-ibs-software-s-icargo-to-transform-its-global-cargo-operations)
- [Air Premia, thông cáo nâng cấp Cargo portal (22/04/2026)](https://company.airpremia.com/117/?bmode=view&idx=171274376)
- [IATA, ONE Record và dữ liệu logistics](https://www.iata.org/en/programs/cargo/e/one-record/)

*Bài viết là phân tích nghiệp vụ dựa trên công bố công khai và tiêu chuẩn ngành; không khẳng định biết cấu hình hoặc màn hình nghiệp vụ nội bộ chưa công bố.*
---

**Đọc tiếp series Air Premia Cargo:**
- [Kỳ 1: Air Premia và iCargo: bộ não số phía sau một hãng hàng không hybrid](/blognaver/bai-viet/air-premia-icargo-cargo-management-system/)
- [Kỳ 2: Từ Freight Forwarder đến e-AWB: một lô hàng Air Premia được đặt chỗ thế nào?](/blognaver/bai-viet/air-premia-cargo-booking-awb-forwarder/)
- [Kỳ 3: Từ GHA đến Boeing 787-9: ULD, Load Control và mối liên hệ giữa Cargo với DCS](/blognaver/bai-viet/air-premia-cargo-gha-uld-weight-balance-dcs/)
- [Kỳ 4: FWB, FFM, FSU, SITA và ONE Record: ngôn ngữ dữ liệu của Air Cargo](/blognaver/bai-viet/air-premia-cargo-messages-sita-one-record-customs/)
- [Kỳ 5: Air Cargo kiếm tiền như thế nào? Revenue Management và thị trường booking số](/blognaver/bai-viet/air-premia-cargo-revenue-management-digital-freight/)
