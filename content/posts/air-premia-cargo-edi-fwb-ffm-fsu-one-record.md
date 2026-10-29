---
title: "FWB, FFM, FSU và ONE Record: ngôn ngữ dữ liệu đứng sau Air Cargo"
date: 2026-10-29T14:38:00+07:00
draft: false
series: ["air-premia-cargo"]
seriesOrder: 4
slug: "air-premia-cargo-edi-fwb-ffm-fsu-one-record"
description: "Vai trò điện văn cargo, truyền dữ liệu hải quan và ranh giới giữa tiêu chuẩn IATA với mạng SITA."
categories: ["Hàng không", "Air Cargo"]
tags: ["Air Premia", "iCargo", "Logistics", "Air Cargo", "Nghiên cứu"]
author: "Duy Nguyen"
featuredImage: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1600&q=85"
featuredImagePreview: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1600&q=85"
---

*Series Air Cargo Air Premia · Kỳ 4/5. Ảnh đầu bài: Ảnh minh họa vận tải hàng hóa (Unsplash).*

Hàng hóa có thể chuyển từ Incheon sang Mỹ trong vài giờ, nhưng dữ liệu của lô hàng phải đến đúng hệ thống, đúng định dạng và đúng thời điểm. Một container đã được xếp lên tàu không đủ để cơ quan quản lý, kho đến và người nhận biết nó là lô hàng nào. Đó là lý do vận hành Air Cargo phụ thuộc nhiều vào **điện văn dữ liệu**.

## Phân biệt thông điệp với mạng truyền tin

IATA định nghĩa các họ thông điệp **Cargo-IMP** và **Cargo-XML**, nhằm tiêu chuẩn hóa dữ liệu trao đổi giữa hãng, GHA, forwarder và các bên khác. **SITA hoặc ARINC** có thể cung cấp dịch vụ truyền thông ngành hàng không, nhưng không nên suy từ chuẩn IATA rằng Air Premia bắt buộc dùng một mạng cụ thể. Thông cáo iCargo của hãng không chứng minh tuyến truyền thông nào được ký hợp đồng.

## FWB, FHL, FFM và FSU khác gì nhau?

- **FWB**: thông điệp dữ liệu vận đơn hàng không (Air Waybill Data Message).
- **FHL**: dữ liệu House Manifest, hữu ích khi một master AWB có nhiều house shipments.
- **FFM**: Flight Manifest Message, phản ánh thông tin manifest gắn với một chuyến bay.
- **FSU**: Status Update Message, dùng để thông báo mốc trạng thái vận chuyển.

Theo tài liệu SOP e-AWB của IATA còn có FMA (acknowledgement) và FNA (rejection/error). Những điện văn này không thay thế chứng từ vận tải trong mọi bối cảnh; chúng giúp các hệ thống đồng bộ và phát hiện thông điệp bị từ chối.

## Một ví dụ về chuỗi dữ liệu

Forwarder gửi dữ liệu AWB, kho xác nhận đã nhận hàng, chuyến bay được lập manifest, hàng được chất lên và sau đó có trạng thái đến đích. Một lỗi dễ hình dung: FWB ghi 10 kiện, trong khi kho thực nhận 9 kiện. Nếu không có cơ chế sửa và đối soát, thông tin upstream và downstream trở nên không nhất quán. Đây là ví dụ kỹ thuật minh họa, không mô tả một sự cố thực tế của Air Premia.

## Hải quan Mỹ: không phải cứ có iCargo là tự tuân thủ

IBS xác nhận hệ thống triển khai cho Air Premia gồm **US Customs capabilities**. Tuy nhiên tuân thủ phụ thuộc đường bay, loại hàng, nghĩa vụ khai báo và cập nhật quy định của cơ quan hữu quan. Các yêu cầu như thông tin cargo advance reporting phải được tổ chức theo trách nhiệm của hãng và các đối tác. Không nên đánh đồng một module phần mềm với bảo đảm tự động tuân thủ mọi chương trình của CBP.

## Cargo-XML và ONE Record là hai cách nhìn khác nhau

Cargo-XML cung cấp các message chuẩn hóa, hỗ trợ trao đổi thông tin theo sự kiện. **ONE Record** của IATA hướng tới mô hình chia sẻ dữ liệu qua API và định nghĩa dữ liệu liên thông. Thay vì tạo nhiều bản sao của toàn bộ trạng thái, một mô hình dữ liệu liên kết có thể cải thiện khả năng truy xuất nguồn gốc, phân quyền và chất lượng dữ liệu. Quá trình chuyển đổi thường cần coexistence với định dạng cũ, chứ không thể xóa FWB/FFM khỏi toàn bộ hệ sinh thái chỉ trong một ngày.

## Từ tracking tới niềm tin

Cổng cargo Air Premia ra mắt tháng 4/2026 cho phép tracking theo từng giai đoạn, với dữ liệu từ iCargo API. Nhưng “real-time” trong marketing không đồng nghĩa GPS gắn vào từng kiện: độ mới thực tế tùy sự kiện được ghi nhận, thời gian chuyển dữ liệu và độ chính xác của bên cập nhật. Khi người dùng thấy “arrived”, điều cần biết là sự kiện này được ghi lúc nào, tại đâu và do hệ thống nào xác nhận.

## Kết luận

Trong Air Cargo, điện văn không phải phụ kiện kỹ thuật: đó là sợi dây nối giữa chứng từ, chuyến bay, kho và hải quan. Kỳ cuối tìm hiểu câu hỏi thương mại: **hàng hóa được định giá thế nào và dữ liệu biến thành doanh thu ra sao?**.

## Đọc toàn bộ series

- [Kỳ 1: Bên trong iCargo của Air Premia: Hệ điều hành vô hình của mảng Air Cargo](/blognaver/bai-viet/air-premia-icargo-he-thong-loi/)
- [Kỳ 2: Từ Freight Forwarder đến e-AWB: một lô hàng được đặt chỗ trên Air Premia ra sao?](/blognaver/bai-viet/air-premia-cargo-booking-eawb/)
- [Kỳ 3: Từ kho hàng lên Boeing 787-9: ULD, DCS và bài toán Weight & Balance](/blognaver/bai-viet/air-premia-belly-cargo-uld-weight-balance/)
- [Kỳ 4: FWB, FFM, FSU và ONE Record: ngôn ngữ dữ liệu đứng sau Air Cargo](/blognaver/bai-viet/air-premia-cargo-edi-fwb-ffm-fsu-one-record/)
- [Kỳ 5: Belly Cargo kiếm tiền thế nào? Revenue Management và Digital Freight của Air Premia](/blognaver/bai-viet/air-premia-cargo-revenue-digital-marketplaces/)

---
### Nguồn tham khảo và phạm vi xác minh
- [IBS Software công bố Air Premia triển khai iCargo ngày 6/7/2022](https://www.ibsplc.com/news/air-premia-airlines-goes-live-with-ibs-software-s-icargo-to-transform-its-global-cargo-operations)
- [Air Premia: nâng cấp cargo portal ngày 22/4/2026](https://company.airpremia.com/117/?bmode=view&idx=171274376&q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&t=board)
- [IATA e-AWB SOP và định nghĩa điện văn](https://www.iata.org/contentassets/b559d10aeb734d5196332b4953dcf312/e-awb-sop-wdh.pdf)

*Bài nghiên cứu độc lập, không đại diện Air Premia. Những sơ đồ luồng là minh họa kiến trúc nghiệp vụ, không phải sơ đồ mạng hay giao diện nội bộ được hãng xác nhận.*
