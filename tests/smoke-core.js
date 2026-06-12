// 共用煙霧測試核心：定義 window.__smoke()
// ──────────────────────────────────────────────────────────
// 由 CI（Playwright 無頭瀏覽器）與本地除錯共用同一份，確保測試基準一致。
//
// 原則：只透過 DOM 操作與觀察，不依賴 app 的內部變數（phase/answers…那些是
// 全域語彙綁定，注入腳本讀不到，也不該耦合）。唯一的例外是 window.playTone
// （top-level function 會掛在 window 上），包起來計次以確認播放路徑有執行。
(function () {
  'use strict';

  // 包裹 playTone 計次：無頭環境沒有真實音效裝置，量實際聲音會 flaky，
  // 改以「題目播放期間有沒有排出音」作為確定性訊號。
  if (!window.__playToneWrapped && typeof window.playTone === 'function') {
    const orig = window.playTone;
    window.__toneCalls = 0;
    window.playTone = function () { window.__toneCalls++; return orig.apply(this, arguments); };
    window.__playToneWrapped = true;
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const enabledPad = () => [].slice.call(document.querySelectorAll('#pad .note-btn, #pad .wkey'))
    .filter(b => !b.disabled);
  const slotCount = () => document.querySelectorAll('#slots .slot').length;
  const gradedCount = () => document.querySelectorAll('#slots .slot.correct, #slots .slot.wrong').length;

  async function until(cond, tries, gap) {
    for (let i = 0; i < tries; i++) { if (cond()) return true; await wait(gap); }
    return false;
  }

  // 跑單一模式：出題 → 把每格填滿（送出鈕變可按為準）→ 送出 → 確認批改與播放
  async function runOne(fails, results, label, setup) {
    try {
      if (setup) await setup();
      window.__toneCalls = 0;
      $('#playBtn').click();
      // 播放結束進入作答時，作答區才會有可按的按鈕
      if (!await until(() => enabledPad().length > 0, 80, 150)) {
        fails.push(label + ': 沒進入作答（作答區無可按按鈕）'); return;
      }
      const toneCalls = window.__toneCalls;   // 題目播放期間排出的音數
      const total = slotCount();
      // 送出鈕在「所有格皆已填」時才會啟用 → 以它為填滿的判準（兩段式作答也適用）
      let guard = 0;
      while ($('#submitBtn').disabled && guard++ < 40) {
        const btns = enabledPad();
        if (!btns.length) { fails.push(label + ': 作答中途無可按按鈕'); break; }
        btns[0].click();
        await wait(50);
      }
      if ($('#submitBtn').disabled) { fails.push(label + ': 填不滿、送出鈕未啟用'); return; }
      $('#submitBtn').click();
      await wait(150);
      const graded = gradedCount();
      results[label] = { graded: graded, slots: total, toneCalls: toneCalls };
      if (graded !== total) fails.push(label + ': 批改 ' + graded + '/' + total);
      if (toneCalls < 1) fails.push(label + ': 播放未排出任何音（playTone 0 次）');
    } catch (e) {
      fails.push(label + ': 例外 ' + (e && e.message));
    }
  }

  const tab = m => document.querySelector('[data-mode="' + m + '"]');
  const setGoal = async v => {
    const sel = document.getElementById('chordGoalSel');
    sel.value = v; sel.dispatchEvent(new Event('change')); await wait(80);
  };

  window.__smoke = async function () {
    const fails = [], results = {};
    await runOne(fails, results, 'single', async () => { tab('single').click(); await wait(120); });
    await runOne(fails, results, 'interval', async () => { tab('interval').click(); await wait(120); });
    await runOne(fails, results, 'scale', async () => { tab('scale').click(); await wait(120); });
    await runOne(fails, results, 'chord-quality', async () => { tab('chord').click(); await wait(60); await setGoal('quality'); });
    await runOne(fails, results, 'chord-name', async () => { await setGoal('name'); });
    return { pass: fails.length === 0, results: results, fails: fails };
  };
})();
