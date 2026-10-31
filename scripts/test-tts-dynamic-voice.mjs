/* Run: node --test scripts/test-tts-dynamic-voice.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const source=readFileSync(
  new URL("../static/tien-ich/text-to-speech/dynamic-voice.js",import.meta.url),"utf8"
);
const window={};
runInNewContext(source,{window,Intl});
const {buildPlan,splitSentences}=window.BNDynamicVoice;

test("splits into sentence-level queue and preserves progress offsets",()=>{
  const source="Bạn có bao giờ tự hỏi?\n\nDự án có 5.000 nhân sự. Tuy nhiên, vẫn khó khăn.";
  const parts=splitSentences(source);
  assert.equal(parts.length,3);
  for(const part of parts)assert.equal(source.slice(part.start,part.end),part.text);
  assert.deepEqual(Array.from(parts,p=>p.paragraphIndex),[0,1,1]);
});

test("hook and questions express curiosity",()=>{
  const [part]=buildPlan("Bạn có bao giờ tự hỏi tại sao?");
  assert.equal(part.rate,0.95);
  assert.equal(part.pitch,1.2);
});

test("exclamations, figures and dramatic transitions get their own cadence",()=>{
  const parts=buildPlan("Một điều kỳ lạ xảy ra! Giá trị đạt 2 nghìn tỷ đô-la Mỹ. Tuy nhiên, tình hình thay đổi.");
  assert.deepEqual(Array.from(parts,p=>[p.rate,p.pitch]),[[1.1,1.2],[0.9,0.95],[1.08,1]]);
});

test("parentheses and aside dash, not English pronunciation hyphens",()=>{
  const a=buildPlan("Một hệ thống (từ chối dữ liệu) hoạt động.")[0];
  assert.equal(a.rate,1.1);assert.equal(a.pitch,.9);
  const b=buildPlan("En-vi-đi-a tăng tốc sản xuất.")[0];
  assert.notEqual(b.category,"aside");
});

test("CTA closes calmly even after a question or exclamation",()=>{
  const a=buildPlan("Chúng ta đã xem một câu chuyện công nghệ. Theo bạn, điều gì đáng nhớ nhất? Cảm ơn các bạn đã theo dõi!");
  assert.equal(a[a.length-2].category,"cta");
  assert.equal(a[a.length-2].rate,.95);
  assert.equal(a[a.length-1].pitch,1);
});

test("never emits a zero-length utterance",()=>{
  const value=buildPlan(" \n\nChào mừng!\n\n  ");
  assert.equal(value.length,1);
  assert.ok(value[0].text);
});
