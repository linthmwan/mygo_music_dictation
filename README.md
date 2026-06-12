# 聽寫練習

線上版：https://linthmwan.github.io/mygo_music_dictation/

純前端單檔（`index.html`），用 Web Audio 合成／SoundFont 採樣發聲，離線可用。

## 模式

- 單音聽寫（按鈕／鋼琴鍵作答、游標可選位置修改）
- 音程辨認
- 音階辨認（11 種音階）
- 和弦辨認（辨認性質／辨認和弦名稱，可開轉位加難）

## 測試

煙霧測試以無頭 Chromium（Playwright）載入 `index.html`，自動跑過四個分頁
出題→作答→送出→批改，並確認播放有發聲、無未捕捉的 JS 例外。

```
npm install            # 首次
npx playwright install chromium
npm test               # 一行執行
```

測試邏輯在 `tests/smoke-core.js`（CI 與本地共用同一份），執行器在
`tests/run-smoke.mjs`。GitHub Actions 於每次 push／PR 自動跑（`.github/workflows/ci.yml`），
未通過會擋住 merge。
