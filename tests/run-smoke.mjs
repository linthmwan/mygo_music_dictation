// 煙霧測試執行器（CI 與本地共用）：node tests/run-smoke.mjs
// ──────────────────────────────────────────────────────────
// 以無頭 Chromium 載入 index.html，注入 tests/smoke-core.js，跑 window.__smoke()，
// 並收集未捕捉的 JS 例外。任一失敗 → 印出訊息並以 exit code 1 結束（CI 會擋 merge）。
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(dir, '..', 'index.html');
const corePath = path.resolve(dir, 'smoke-core.js');

// 外部資源（CDN 採樣／函式庫）載入失敗不算 app 的錯，過濾掉避免誤擋
const IGNORE = /gleitz|jsdelivr|favicon|net::|Failed to load resource|status of (4|5)\d\d/i;

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],  // 無頭環境允許 AudioContext 免手勢啟動
});
const page = await browser.newPage();

const jsErrors = [];
page.on('pageerror', e => jsErrors.push('未捕捉例外: ' + e.message));
page.on('console', msg => {
  if (msg.type() === 'error' && !IGNORE.test(msg.text())) jsErrors.push('console.error: ' + msg.text());
});

let result;
try {
  await page.goto('file://' + indexPath, { waitUntil: 'load' });
  await page.addScriptTag({ path: corePath });
  result = await page.evaluate(() => window.__smoke());
} catch (e) {
  result = { pass: false, results: {}, fails: ['測試執行失敗: ' + e.message] };
}
await browser.close();

const fails = [...(result.fails || []), ...jsErrors];
const pass = fails.length === 0;

console.log('\n=== 聽寫練習 煙霧測試 ===');
for (const [k, v] of Object.entries(result.results || {})) {
  console.log(`  ${k.padEnd(14)} 批改 ${v.graded}/${v.slots}・播放 ${v.toneCalls} 音`);
}
if (!pass) {
  console.log('\n✗ 失敗：');
  for (const f of fails) console.log('   - ' + f);
  console.log('');
  process.exit(1);
}
console.log('\n✓ 全部通過\n');
process.exit(0);
