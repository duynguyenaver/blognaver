// Run: node scripts/test-thumbnail-safe-text.cjs
// Guard both Canvas text placement and the Preview Lab 10% guideline.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const base = "static/tien-ich/youtube-thumbnail-cover-generator/";
const js = fs.readFileSync(path.join(root, base, "studio.js"), "utf8");
const css = fs.readFileSync(path.join(root, base, "preview-lab.css"), "utf8");
assert.match(css, /\.ys-guides:before\{[^}]*inset:10%/);
const start = js.indexOf("function headlineFrom(j)");
const end = js.indexOf("function db(){", start);
assert.ok(start >= 0 && end > start, "Can't locate production Canvas renderer");
const init = new Function("document","clean","Image",js.slice(start,end)+";return {renderCanvas};");
const examples=[
  ["thumbnail","Tencent Thâu Quyền: Mô Hình Đồ Thị Tích Hợp","Công nghệ, An toàn, Đổi mới – Tất cả trong một","BLOGNAVER · INSIGHTS"],
  ["cover","Tencent Thâu Quyền: Mô Hình Đồ Thị Tích Hợp","Công nghệ, An toàn, Đổi mới – Tất cả trong một","BLOGNAVER · INSIGHTS"],
  ["thumbnail","Công nghệ AI và phân tích dữ liệu thông minh: Cuộc cách mạng đang thay đổi mọi thứ","Một phụ đề cực dài được kiểm tra tự động xem có thoát ra khỏi vùng chữ an toàn hay không","BLOGNAVER · PHÂN TÍCH CÔNG NGHỆ"],
  ["cover","SUPERLONGTITLEWITHOUTANYSPACES1234567890abcdefghij và tương lai công nghệ Việt Nam","Công nghệ, kiến trúc, đổi mới và an toàn thông tin trong một hệ sinh thái","BLOGNAVER · INSIGHTS"]
];
(async()=>{
  for(const [type,headline,subline,series] of examples){
    const canvas={width:0,height:0,draws:[],getContext(){return c}};
    const c={font:"700 20px system-ui",textAlign:"left",
      save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},roundRect(){},fill(){},stroke(){},
      translate(){},rotate(){},ellipse(){},drawImage(){},
      createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},
      measureText(text){
        const size=Number((this.font.match(/(\d+)px/)||[])[1]||16);
        return {width:Array.from(text).reduce((sum,ch)=>sum+(ch.codePointAt(0)>255?.9:.55)*size,0)};
      },
      fillText(text,x,y){
        const size=Number((this.font.match(/(\d+)px/)||[])[1]||16),width=this.measureText(text).width;
        canvas.draws.push({text,left:this.textAlign==="right"?x-width:x,
          right:this.textAlign==="right"?x:x+width,top:y,bottom:y+size*1.12});
      }
    };
    const {renderCanvas}=init({createElement:()=>canvas},s=>String(s||"").trim(),class {});
    await renderCanvas({headline,subline,series,script:"fixture",style:"tech",accent:"#6366f1"},type,1).ready;
    const bounds={left:canvas.width*.1,right:canvas.width*.9,top:canvas.height*.1,bottom:canvas.height*.9};
    for(const d of canvas.draws){
      assert.ok(d.left>=bounds.left-.01&&d.right<=bounds.right+.01,"Horizontal overflow: "+d.text);
      assert.ok(d.top>=bounds.top-.01&&d.bottom<=bounds.bottom+.01,"Vertical overflow: "+d.text);
    }
    const normalize=s=>s.replace(/\s+/g,"");
    const text=normalize(canvas.draws.map(x=>x.text).join(""));
    for(const original of [headline,subline,series])
      assert.ok(text.includes(normalize(original)),"Text was truncated: "+original);
    console.log("PASS",type,canvas.width+"x"+canvas.height,canvas.draws.length+" lines");
  }
})().catch(error=>{console.error(error);process.exitCode=1});
