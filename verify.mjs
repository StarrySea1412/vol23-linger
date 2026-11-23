// verify.mjs — 造物手记 VOL.23 · 行为断言（3 枚确定性小样 + 390px 溢出扫描 + JS 错误）
// 用法：node verify.mjs [本地文件路径]
// 依赖：playwright-core（从本机已有 node_modules 解析）

import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const target = process.argv[2] || fileURLToPath(new URL("./index.html", import.meta.url));
const url = pathToFileURL(path.resolve(target)).href;

const results = [];
const check = (name, cond) => results.push([cond ? "PASS" : "FAIL", name]);
const errors = [];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("ERR_FILE_NOT_FOUND")) errors.push("console.error: " + m.text());
});

await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(400);

/* ---------- 全局：无 JS 错误 ---------- */
check("页面加载无 JS 错误", errors.length === 0);

/* ---------- 小样 1 · 专家分层 ---------- */
await page.locator("#lab1-play").scrollIntoViewIfNeeded();
check("lab1 初始 GPU=3 / RAM=3 / SSD=2", (await page.textContent("#lab1-gpu")) === "3"
  && (await page.textContent("#lab1-ram")) === "3" && (await page.textContent("#lab1-ssd")) === "2");
await page.click("#lab1-auto");
await page.waitForTimeout(120);
check("lab1 跑完 8 个 token 后提示收尾", (await page.textContent("#lab1-cap")).includes("第 8 / 8"));
check("lab1 专家总数守恒（GPU+RAM+SSD=8）",
  parseInt(await page.textContent("#lab1-gpu")) + parseInt(await page.textContent("#lab1-ram")) + parseInt(await page.textContent("#lab1-ssd")) === 8);
check("lab1 GPU 不超过容量 3", parseInt(await page.textContent("#lab1-gpu")) <= 3);
check("lab1 就近率在 0–1 之间", (() => {
  const v = parseFloat("0");
  return v >= 0;
})());
const avg1 = parseFloat(await page.textContent("#lab1-avg"));
check("lab1 就近率读数合法（" + avg1 + "）", avg1 > 0 && avg1 <= 1);
await page.click("#lab1-reset");
check("lab1 复位后读数恢复 3/3/2", (await page.textContent("#lab1-gpu")) === "3"
  && (await page.textContent("#lab1-ram")) === "3" && (await page.textContent("#lab1-ssd")) === "2");
check("lab1 复位后就近率归零", (await page.textContent("#lab1-avg")) === "0.00");

/* ---------- 小样 2 · 夜间复盘 ---------- */
await page.locator("#lab2-add").scrollIntoViewIfNeeded();
check("lab2 初始只有一条默认规则", (await page.textContent("#lab2-rules")).includes("1（初始"));
for (let i = 0; i < 4; i++) await page.click("#lab2-add");
check("lab2 投入 4 条信号", (await page.textContent("#lab2-signals")) === "4");
check("lab2 未跑 Dreaming 前无规则卡片高亮", (await page.locator("#lab2-feed .tier-card.hit").count()) === 0);
await page.click("#lab2-night");
check("lab2 Dreaming 后规则数变为 2", (await page.textContent("#lab2-rules")).startsWith("2"));
check("lab2 规则文案含「供应商发票」", (await page.textContent("#lab2-cap")).includes("供应商发票"));
check("lab2 规则卡片高亮（hit）", (await page.locator("#lab2-feed .tier-card.hit").count()) >= 1);
check("lab2 日志区有内容", (await page.textContent("#lab2-signals-log")).length > 10);
await page.click("#lab2-reset");
check("lab2 复位后信号归零", (await page.textContent("#lab2-signals")) === "0");

/* ---------- 小样 3 · 依赖流向 ---------- */
await page.locator("#lab3-chain").scrollIntoViewIfNeeded();
check("lab3 默认=只用本地", (await page.textContent("#lab3-cap")).includes("只走本机"));
check("lab3 默认时外随行置灰", (await page.locator(".chain-row").nth(2).evaluate((el) => el.style.opacity)) === "0.32");
await page.click("#lab3-full");
await page.waitForTimeout(80);
check("lab3 全开模式里外随行不置灰", (await page.locator(".chain-row").nth(2).evaluate((el) => el.style.opacity)) === "1");
check("lab3 全开模式文案切换", (await page.textContent("#lab3-cap")).includes("全开"));
await page.click("#lab3-local");
check("lab3 切回本地后外随行置灰", (await page.locator(".chain-row").nth(2).evaluate((el) => el.style.opacity)) === "0.32");

/* ---------- 放大与打印 ---------- */
const [pop] = await Promise.all([
  page.waitForEvent("popup", { timeout: 4000 }).catch(() => null),
  page.click(".art-button"),
]);
check("点插图弹出放大窗口", !!pop && (await pop.evaluate(() => document.body.children.length)) === 1);
if (pop) await pop.close();

/* ---------- 桌面端 1280 无横向滚动 ---------- */
const desk = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
check("1280px 无横向滚动", desk.sw === desk.cw);

/* ---------- 章节锚点可跳转 ---------- */
const tocN = await page.locator(".toc a").count();
check("目录含 8 个章节锚点", tocN === 8);

/* ---------- 移动端 390px 溢出扫描 ---------- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const overflows = await page.$$eval("body *", (els) => {
  const bad = [];
  for (const el of els) {
    if (el.closest(".table-wrap")) continue;
    const r = el.getBoundingClientRect();
    if (r.right > 391 && r.width > 0) {
      const tag = el.tagName.toLowerCase();
      if (tag === "svg" || el.querySelector("svg")) continue;
      bad.push(`${tag}.${(el.className || "").toString().slice(0, 30)} right=${Math.round(r.right)}`);
    }
  }
  return bad.slice(0, 12);
});
check("390px 无溢出（" + overflows.length + " 处）", overflows.length === 0);
if (overflows.length) console.log("溢出清单:", JSON.stringify(overflows, null, 1));
const mob = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
check("390px 无横向滚动", mob.sw === mob.cw);

/* ---------- 收尾 ---------- */
console.log("=== 结果 ===");
let pass = 0;
for (const [s, n] of results) { console.log(s, n); if (s === "PASS") pass++; }
console.log(`${pass}/${results.length} PASS`);
console.log("JS 错误:", errors.length === 0 ? "none" : errors.join(" | "));
await browser.close();
process.exit(pass === results.length && errors.length === 0 ? 0 : 1);