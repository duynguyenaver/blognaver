---
title: "Từ Freight Forwarder đến e-AWB: một lô hàng được đặt chỗ trên Air Premia ra sao?"
date: 2026-10-29T14:36:00+07:00
draft: false
series: "air-premia-cargo"
seriesOrder: 2
slug: "air-premia-cargo-booking-eawb"
description: "Quy trình cargo booking, tải cung ứng, chargeable weight, AWB và cổng đặt chỗ số Air Premia."
categories: ["Hàng không", "Air Cargo"]
tags: ["Air Premia", "iCargo", "Logistics", "Air Cargo", "Nghiên cứu", "series"]
author: "Duy Nguyen"
featuredImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=85"
featuredImagePreview: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=85"
---

*Series Air Cargo Air Premia · Kỳ 2/5. Ảnh đầu bài: Ảnh minh họa hoạt động logistics (Unsplash).*

Ở mảng hành khách, đặt chỗ thường xoay quanh số ghế và hạng giá. Trong hàng hóa hàng không, một booking không chỉ hỏi “còn chỗ không?” mà phải trả lời: kiện hàng có vừa cửa hầm hàng, có quá giới hạn chịu tải, và cước được tính trên khối lượng nào?

## Ai là người đặt chỗ?

Khách gửi hàng thường làm việc với **freight forwarder**. Forwarder gom thông tin người gửi, người nhận, số kiện, kích thước, loại hàng, thời hạn giao và các chứng từ. Đại lý liên hệ hãng hoặc dùng cổng e-booking. Ở Air Premia, việc portal mới hỗ trợ booking và thay đổi booking qua **iCargo API** được hãng công bố ngày 22/4/2026; tuy nhiên không nên mặc nhiên nói mọi forwarder đều có quyền truy cập trực tiếp mà không qua thẩm định tài khoản.

## Capacity không phải một con số cố định

Một tàu bay chở khách như Boeing 787-9 có **belly cargo**, song tải dành cho hàng hóa phụ thuộc số hành khách, hành lý, nhiên liệu, đường bay và hạn chế bay. Bộ phận cargo cần phân biệt **theoretical capacity**, **available payload** và **sellable capacity**. Bán vượt giới hạn cuối cùng tạo ra nguy cơ offload hoặc chuyển chuyến. Vì vậy inventory cargo thường mang tính động hơn tưởng tượng.

## Chargeable weight: tại sao 100 kg chưa chắc tính cước 100 kg?

Cước hàng không thường đối chiếu trọng lượng thực (gross weight) với **volumetric weight** theo hệ số áp dụng trong hợp đồng và tuyến. Với ví dụ minh họa kiện 120×80×100 cm, thể tích là 960.000 cm³. Nếu dùng hệ số 6.000 cm³/kg, volumetric weight là 160 kg; trong khi kiện hàng chỉ nặng 100 kg, chargeable weight có thể là 160 kg. Đây là ví dụ đào tạo, không phải giá hay công thức hợp đồng cụ thể của Air Premia.

## AWB là dữ liệu nghiệp vụ và hợp đồng vận chuyển

**Master Air Waybill (MAWB)** là vận đơn do hãng hoặc đại diện phát hành; House AWB (HAWB) thường gắn với quan hệ giữa forwarder và người gửi. Các trường cơ bản gồm AWB number, airport of origin/destination, shipper, consignee, pieces, gross weight, commodity description và điều kiện cước. Sai tên người nhận hoặc số kiện không phải lỗi trình bày vô hại: có thể ảnh hưởng tiếp nhận, thông quan và bàn giao.

**e-AWB** thay quy trình dựa trên chứng từ giấy bằng thỏa thuận và dữ liệu điện tử phù hợp. Nhưng “electronic” không có nghĩa mọi nước và mọi bên đều bỏ hoàn toàn mọi chứng từ bổ trợ. Với lô hàng nguy hiểm, hàng lạnh hoặc hàng cần giấy phép, yêu cầu riêng vẫn phải được kiểm tra.

## Trình tự từ booking tới Ready for Carriage

Một tình huống điển hình: đại lý gửi booking → hãng xác nhận tải và sản phẩm → AWB data được trao đổi → hàng đưa tới kho → GHA kiểm kiện, cân, đo và chứng từ → lô hàng đạt trạng thái **RCS (Received from Shipper, Ready for Carriage)** khi đáp ứng điều kiện. Nếu hàng thực tế lệch dữ liệu đã đặt, booking hoặc AWB phải được sửa theo quy trình. RCS không đồng nghĩa tàu bay đã cất cánh.

## Portal số giải quyết được gì, không giải quyết được gì?

Cổng Air Premia mới giúp giảm email qua lại khi tra booking và theo dõi. Nhưng người dùng vẫn cần phân biệt **booking accepted** với **cargo physically accepted**, **planned flight** với **flown**, và **delivered** với **arrived**. Khả năng quan sát tiến trình cần đi cùng định nghĩa trạng thái nhất quán giữa hãng, kho và forwarder.

## Kết luận

Một lô hàng bắt đầu bằng booking, nhưng chỉ thực sự sẵn sàng vận chuyển khi dữ liệu, tải và hàng thực tế khớp nhau. Kỳ sau sẽ theo lô hàng vào kho, từ ULD đến **loadsheet và Weight & Balance**.

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
