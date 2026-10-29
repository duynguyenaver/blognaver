---
title: "Bên trong iCargo của Air Premia: Hệ điều hành vô hình của mảng Air Cargo"
date: 2026-10-29T10:00:00+07:00
draft: false
series: ["air-premia-cargo"]
seriesOrder: 1
slug: "air-premia-icargo-he-thong-loi"
description: "Phân tích triển khai iCargo tại Air Premia, kiến trúc quản trị hàng hóa và sự khác biệt với hệ thống hành khách."
categories: ["Hàng không", "Air Cargo"]
tags: ["Air Premia", "iCargo", "Logistics", "Air Cargo", "Nghiên cứu"]
author: "Duy Nguyen"
featuredImage: "https://cdn.imweb.me/upload/S201810085bbafdbe98c6c/f423370909c9b.png"
featuredImagePreview: "https://cdn.imweb.me/upload/S201810085bbafdbe98c6c/f423370909c9b.png"
---

*Series Air Cargo Air Premia · Kỳ 1/5. Ảnh đầu bài: Air Premia / nguồn ảnh từ Air Premia (ảnh minh họa nghiệp vụ).*

Một hãng hàng không hybrid có thể bán ghế theo trải nghiệm tương đối quen thuộc với đại lý du lịch, nhưng mỗi kilogram hàng hóa trong bụng tàu bay lại đi qua một chuỗi quyết định dữ liệu hoàn toàn khác. Với **Air Premia**, dấu mốc rõ nhất là thông cáo ngày **6/7/2022**: IBS Software xác nhận hãng đưa **iCargo Sales and Operations** vào vận hành dưới hình thức SaaS. Đây là dữ kiện được công bố, khác với việc suy luận từ các phần mềm phổ biến trong ngành.

## Vì sao Passenger Service System không thể thay Cargo Management System?

PSS quản lý ghế, hành trình hành khách, vé và dịch vụ bổ trợ. Một lô hàng lại có **AWB**, số kiện, trọng lượng thực, trọng lượng tính cước, thể tích, loại hàng, điều kiện bảo quản, người gửi, người nhận và các điểm xử lý mặt đất. Nếu chỉ sử dụng sơ đồ chỗ ngồi, hãng không biết một lô hàng có đủ điều kiện vận chuyển hay được GHA tiếp nhận hay chưa. Vì vậy **CMS** là lớp nghiệp vụ độc lập, dù vẫn trao đổi dữ liệu với lịch bay và vận hành tàu bay.

## iCargo thực sự được xác nhận làm gì tại Air Premia?

IBS nêu rõ những mảng đã triển khai gồm **reservation**, **capacity allocation and management**, **AWB stock management**, quản lý sản phẩm, xử lý gián đoạn, **cargo acceptance**, **load planning** và chức năng liên quan **US Customs**. Đây là phạm vi có chứng cứ; không có nghĩa mọi module trong danh mục sản phẩm iCargo đều được Air Premia mua hoặc kích hoạt. Đặc biệt, việc nhà cung cấp hỗ trợ warehouse management hay revenue accounting nói chung không chứng minh Air Premia dùng đầy đủ các module ấy.

## Một booking đi qua những lớp thông tin nào?

Giả sử một freight forwarder đề nghị vận chuyển 12 kiện phụ tùng từ Incheon tới Los Angeles. Hệ thống phải đối chiếu lịch bay với tải hàng có thể bán; kiểm tra kích thước, tổng khối lượng, điều kiện nhận; xác nhận chỗ; theo dõi chứng từ; rồi nhận trạng thái hàng thực tế khi kho tiếp nhận. Nếu chuyến bay đổi tàu bay hoặc lượng hành lý tăng, capacity mà sales đã bán có thể không còn giống tải được phép mang. Hệ thống cần có quy trình cập nhật và xử lý ngoại lệ.

Sơ đồ logic: **Freight Forwarder → Booking/Capacity → AWB → GHA Acceptance → Load Planning → Flight → Arrival & Delivery**. Đây là luồng nghiệp vụ khái quát, không phải giao diện iCargo của hãng.

## Vì sao SaaS đáng chú ý với một hãng hybrid?

Với mô hình SaaS, hãng sử dụng ứng dụng do nhà cung cấp vận hành và cập nhật; nhờ đó có thể giảm phần việc tự xây một hệ thống cargo từ đầu. Nhưng SaaS không làm mất những nghĩa vụ phức tạp: thiết kế phân quyền, tích hợp GHA, đảm bảo dữ liệu xuyên biên giới, thời gian phản hồi, phương án dự phòng và giám sát SLA. Điểm quan trọng không phải 'có hệ thống hiện đại' mà là **dữ liệu sales và operations có cùng một sự thật vận hành**.

## Bước ngoặt tháng 4/2026: iCargo đi ra khỏi back office

Ngày **22/4/2026**, Air Premia giới thiệu cargo portal mới có booking, kiểm tra/chỉnh sửa booking và tracking trên web/mobile, kết nối API với iCargo. Như vậy ranh giới của hệ thống lõi không dừng ở nhân viên nội bộ: khách hàng và đại lý bắt đầu tương tác với dữ liệu qua một lớp sản phẩm số. Điều này mở ra câu hỏi mới về phân quyền tài khoản đại lý, độ trễ cập nhật và cách xử lý khi API không sẵn sàng.

## Kết luận

Câu chuyện iCargo của Air Premia là ví dụ điển hình về số hóa nghiệp vụ chuyên sâu: không thể dùng hệ đặt vé hành khách để thay một hệ thống Cargo. Bài tiếp theo đi sâu vào **booking, chargeable weight và e-AWB**, nơi mỗi số liệu bắt đầu trở thành một cam kết vận chuyển.

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
