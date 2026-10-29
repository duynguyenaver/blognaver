---
title: "Từ kho hàng lên Boeing 787-9: ULD, DCS và bài toán Weight & Balance"
date: 2026-10-29T14:37:00+07:00
draft: false
series: "air-premia-cargo"
seriesOrder: 3
slug: "air-premia-belly-cargo-uld-weight-balance"
description: "Giải thích GHA, build-up ULD, giới hạn tải và liên kết dữ liệu cargo với load control."
categories: ["Hàng không", "Air Cargo"]
tags: ["Air Premia", "iCargo", "Logistics", "Air Cargo", "Nghiên cứu", "series"]
author: "Duy Nguyen"
featuredImage: "https://cdn.imweb.me/upload/S201810085bbafdbe98c6c/20a84695e8227.png"
featuredImagePreview: "https://cdn.imweb.me/upload/S201810085bbafdbe98c6c/20a84695e8227.png"
---

*Series Air Cargo Air Premia · Kỳ 3/5. Ảnh đầu bài: Air Premia / ảnh cargo aircraft (minh họa).*

Trên một chuyến bay chở khách, người ta dễ nhìn thấy cabin, ghế và hành lý xách tay. Ít người thấy những ULD nằm ở lower deck, nơi cargo phải tuân thủ giới hạn tải trọng và phân bố trọng tâm nghiêm ngặt. **Air Premia khai thác Boeing 787-9**; tuy nhiên tải cargo cụ thể theo chuyến không thể suy ra chỉ từ loại tàu bay.

## Một ULD không đơn thuần là chiếc thùng

**Unit Load Device (ULD)** gồm container và pallet được thiết kế phù hợp hệ thống chằng giữ của tàu bay. Cần kiểm tra mã loại, trọng lượng bì (tare), giới hạn trọng lượng toàn bộ, tình trạng hư hỏng và quy tắc chất xếp. Một chiếc ULD có trọng lượng bì là một phần của tải thực, chứ không phải “bao bì miễn phí”. Các cấu hình và số vị trí còn phụ thuộc loại 787-9 và điều kiện khai thác của từng hãng.

## GHA tiếp nhận hàng như thế nào?

Tại cargo terminal, **Ground Handling Agent** có thể nhận AWB data từ hệ thống hãng hoặc kênh EDI; kiểm tra kiện, dán nhãn, cân đo, đối chiếu hàng đặc biệt rồi đưa vào kho/chặng staging. Việc chấp nhận hàng không chỉ là quét mã vạch: hàng có pin lithium, dược phẩm kiểm soát nhiệt độ hoặc kích thước quá khổ đòi hỏi quy trình riêng. Các bước dưới đây là mô hình ngành, không phải quy trình nội bộ Air Premia được công bố.

## Build-up và vị trí xếp trên tàu bay

Nhân viên kho có thể build-up một pallet/container từ nhiều lô hàng. Tải trong ULD cần được ràng buộc, bảo đảm không vượt chiều cao và giới hạn trọng lượng. Sau đó Load Planning phân bổ ULD theo các vị trí trong hầm hàng. Vấn đề không chỉ là tổng số tấn: vị trí trước/sau và phân bố quanh thân tàu ảnh hưởng **center of gravity (CG)**. Một thay đổi vài trăm kilogram ở vị trí xa trọng tâm có thể tạo tác động khác với cùng lượng hàng ở vị trí gần CG.

## DCS có phải hệ quản lý cargo không?

**Không nên đồng nhất DCS với CMS.** DCS xử lý khía cạnh departure của hành khách và có thể liên kết module load control/weight-and-balance tùy cấu trúc nhà cung cấp. CMS quản lý booking, AWB và trạng thái hàng. Dữ liệu hàng đã xếp cần chuyển sang công tác load control để lập loadsheet. Việc chuyển dữ liệu có thể là tích hợp hệ thống hoặc quy trình được kiểm soát; chưa có nguồn công khai xác nhận màn hình DCS hay giao thức tích hợp cụ thể của Air Premia.

## Công thức tải trọng: cần đầy đủ thành phần

Một cách viết tổng quát là **takeoff weight = dry operating weight + traffic load + takeoff fuel**. Trong đó traffic load gồm hành khách, hành lý và hàng hóa/thư. Đây chỉ là quan hệ khối lượng; khai thác thực tế còn phải thỏa **MTOW**, giới hạn zero-fuel weight, landing weight và giới hạn CG. Không thể chỉ cộng khách + hành lý + cargo + nhiên liệu mà quên trọng lượng khai thác của chính tàu bay.

## Ai quyết định cuối cùng?

Thông tin từ kho và cargo sales không tự biến thành quyền cất cánh. Load controller đối chiếu load instruction, actual loaded figures và các thay đổi phút cuối; phi hành đoàn nhận loadsheet theo quy trình khai thác. Nếu ULD đã được offload nhưng dữ liệu chưa cập nhật, nguy cơ là tải thực và tải khai báo không khớp. Vì thế chuỗi kiểm soát thay đổi là vấn đề an toàn, không chỉ doanh thu.

## Kết luận

Hầm hàng là nơi một quyết định bán chỗ phải trở thành tải thực hợp lệ. iCargo hỗ trợ load planning theo thông cáo của IBS; tuy nhiên việc nó tích hợp thế nào với hệ load control của Air Premia chưa được công bố. Kỳ tới là lớp dữ liệu kết nối các bên: **FWB, FFM, FSU, Cargo-XML và hải quan**.

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
