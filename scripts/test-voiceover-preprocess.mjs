/* Regression tests for the BlogNaver YouTube voiceover preprocessor.
 * Run: node --test scripts/test-voiceover-preprocess.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const script = readFileSync(new URL("../static/tien-ich/text-to-speech/voiceover-preprocess.js", import.meta.url), "utf8");
const window = {};
runInNewContext(script, { window, document:{getElementById:()=>null} });
const { cleanScript } = window.BNVoiceoverPreprocessor;
const includesAll = (text, terms) => terms.forEach(value=>assert.ok(text.includes(value), "Missing: "+value));

test("removes author, word counts, fragments, source footer", () => {
  const input = "# Bài viết\nDuy Nguyen | 31/10/2026 | 1378 từ | 7 phút\ntrong.\nvà.\nsê-ri.\nThể loại: Công nghệ\n\n## Kiến trúc\nTrụ sở mới tại Santa Clara có 500.000 feet vuông.\n\n## Nguồn và phương pháp\nColdFusion Research...\nBài viết phân tích dựa trên phụ đề...";
  const value = cleanScript(input).text;
  includesAll(value, ["Nói về kiến trúc,","San-ta Cờ-la-ra","năm trăm nghìn phít vuông"]);
  ["Duy Nguyen","1378 từ","sê-ri.","ColdFusion Research","Nguồn và phương pháp"].forEach(s=>assert.ok(!value.includes(s), "Unexpected: "+s));
});

test("Vietnamese spoken measurements and currency", () => {
  const value = cleanScript("2 nghìn tỷ USD, 500.000 feet vuông, 5.000 nhân sự, 3D, 15%, 30 năm.").text;
  includesAll(value,["hai nghìn tỷ đô-la Mỹ","năm trăm nghìn phít vuông","năm nghìn nhân sự","Ba Đê","mười lăm phần trăm","ba mươi năm"]);
});

test("brand, place, and technology phonetic dictionary", () => {
  const value=cleanScript("Nvidia, Santa Clara, Voyager, Endeavor, California, MIT, DJI, Intel, Apricot Forest, Fudan, Terabits, Gigabits, Gigabytes, Wi-Fi, Internet of Things, IoT, QR, GPS, Drone, LED, VLC.").text;
  includesAll(value,["En-vi-đi-a","San-ta Cờ-la-ra","Voi-ơ-jơ","En-đê-vơ","Ca-li-phót-ni-a","Em-Ai-Ti","Đi-Ji-Ai","In-tel","A-pri-cot Pho-rét","Phúc Đán","Tê-ra-bít","Gi-ga-bít","Gi-ga-bay","Quay-Phay","In-tơ-nét off Thing-sơ","Ai-Ô-Tê","Kiu-A","Gi-Pi-Ép","Đơ-ron","Lét","Vê-Ép-Cê"]);
});

test("context-aware transitions and conclusion", () => {
  const value=cleanScript("# Công nghệ\n\nTrải qua ba thập kỷ, công ty phát triển.\n\n## Kiến trúc\nTrụ sở được xây dựng.\n\n## Tổ chức\nNhân sự hợp tác.\n\n## Thách thức\nQuá trình triển khai gặp khó khăn.\n\n## Kết luận\nHai tòa nhà giúp tăng kết nối.").text;
  includesAll(value,["Chào mừng các bạn quay trở lại","Đầu tiên, trải qua","Nói về kiến trúc,","Dưới lăng kính phân tích tổ chức,","Tuy nhiên,","Tóm lại,","Cảm ơn các bạn đã theo dõi!"]);
});

test("purges calendar dates within body but preserves technical quantities", () => {
  const value=cleanScript("MIT nghiên cứu AI tại California. Ngày 31/10/2026, công ty triển khai kế hoạch 30 năm.").text;
  includesAll(value,["Em-Ai-Ti","Ei-Ai","Ca-li-phót-ni-a","ba mươi năm"]);
  assert.ok(!value.includes("31/10/2026"));
  assert.ok(!value.includes("ngày ba mươi mốt"));
});

test("removes orphan words, does not add repeated intro/outro", () => {
  const once=cleanScript("trong.\nvà.\nsê-ri.\nNhìn chung, kết luận.\n\nCông ty phát triển.").text;
  assert.ok(!once.includes("Nhìn chung, kết luận"));
  assert.ok(once.includes("Đầu tiên, công ty phát triển"));
  assert.equal(cleanScript(once).text,once);
});


test("hook, conversational voiceover ending and Hoai My pronunciation", () => {
 const input="# Kiến trúc trụ sở Nvidia\n\nLập luận thiết kế cho rằng Santa Clara là trung tâm kết nối.\n\n## Kết luận\nHai tòa nhà giúp nhân viên làm việc cùng nhau.";
 const result=cleanScript(input).text;
 includesAll(result,["Vì sao một trụ sở","Chào mừng","Tại sao lại chọn hướng thiết kế này?","Theo lập luận thiết kế","Tóm lại,","Theo bạn,","Hãy chia sẻ góc nhìn","Cảm ơn các bạn"]);
});

test("Hoai My D phonetics and additional technical acronyms", () => {
 const text=cleanScript("3D, 2D, R&D, AI, IT, MIT, CPU, GPU, ChatGPT, Silicon Valley, Semiconductor, Silicon.").text;
 includesAll(text,["Ba Đê","Hai Đê","A-ren-Đê","Ei-Ai","Ai-Ti","Em-Ai-Ti","Si-Pi-U","Gi-Pi-U","Chát-Gi-Pi-Ti","Si-li-con Va-li","Xe-mi-con-đắc-tơ","Si-li-con"]);
 assert.ok(!text.includes("Ba Dê"));
});

test("storytelling reprocessing is stable", () => {
 const first=cleanScript("# Tòa nhà\n\nLập luận thiết kế cho rằng công trình tạo kết nối.").text;
 assert.equal(cleanScript(first).text,first);
});


test("hotfix: eliminates dates in inline and mixed publication metadata",()=>{
 const input="# Báo cáo công nghệ\nDuy Nguyen · 30/10/2026 · 1378 từ · 7 phút\n31/10/2026\nsê-ri.\ntrong.\nvà.\ntừ\nphút\n\n## Hạ tầng\nNvidia ngày 31/10/2026 có GPU và 3D. Trong 30 năm, đội ngũ phát triển.\n\n## Nguồn và phương pháp\nColdFusion Research\nResearch Studio\nẢnh nhận diện nguồn video";
 const output=cleanScript(input).text;
 includesAll(output,["En-vi-đi-a","Gi-Pi-U","Ba Đê","ba mươi năm"]);
 for(const fragment of ["Duy Nguyen","30/10/2026","31/10/2026","1378 từ","7 phút","sê-ri.","trong.","và.","ColdFusion Research","Research Studio","Ảnh nhận diện nguồn video"]){
   assert.ok(!output.includes(fragment),"Unexpected metadata: "+fragment);
 }
});
test("hotfix: handles DD.MM.YY, ISO YYYY-MM-DD, month/year and natural date phrases",()=>{
 const input="Nvidia giới thiệu GPU ngày 31.10.26. Vào 10/2026, Intel tiếp tục dự án. Ngày 30 tháng 10 năm 2026, hãng dùng 2D. 2026-10-31 ghi lại một lần nữa.";
 const output=cleanScript(input).text;
 includesAll(output,["En-vi-đi-a","Gi-Pi-U","In-tel","Hai Đê"]);
 for(const token of ["31.10.26","10/2026","30 tháng 10","2026-10-31","năm hai nghìn không trăm hai mươi sáu","Vào,"]){
   assert.ok(!output.includes(token),"Unexpected date fragment: "+token);
 }
});
test("hotfix: metadata labels and reading statistics vanish even when standalone",()=>{
 const value=cleanScript("Ngày xuất bản\n30/10/2026\nThời lượng đọc\n1881 từ / 9 phút\n\nNvidia sản xuất GPU.").text;
 includesAll(value,["En-vi-đi-a","Gi-Pi-U"]);
 for(const token of ["Ngày xuất bản","Thời lượng đọc","1881","9 phút","30/10"]){
   assert.ok(!value.includes(token));
 }
});
test("hotfix: does not delete meaningful Vietnamese words and spoken durations",()=>{
 const result=cleanScript("Trong 7 phút thuyết trình, Nvidia giới thiệu GPU cùng 30 năm kinh nghiệm.").text;
 includesAll(result,["trong bảy phút thuyết trình","En-vi-đi-a","Gi-Pi-U","ba mươi năm"]);
});
test("hotfix: completed script also removes calendar dates on reprocess",()=>{
 const first=cleanScript("Nvidia có GPU.").text;
 const withDate=first.replace("Gi-Pi-U.","Gi-Pi-U ngày 31/10/2026.");
 const output=cleanScript(withDate).text;
 assert.ok(!output.includes("31/10/2026"));
 assert.equal((output.match(/Chào mừng các bạn/g)||[]).length,1);
});
