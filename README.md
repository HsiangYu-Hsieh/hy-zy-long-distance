# 💗 Hsiang‑Yu × Zi‑Yi Long Distance Dashboard

這是一個純前端 PWA，給 Hsiang‑Yu 與 Zi‑Yi 遠距期間使用。

## 已完成

- 即時雙時區時鐘
- Hsiang‑Yu / Zi‑Yi 兩種觀看模式
- Taiwan / San Antonio / Los Angeles 自動切換
- 使用 IANA 時區，自動處理美國夏令時間（DST）
- Zi‑Yi 平日 08:00–17:00 工作狀態
- 固定通話時間自動高亮
- 下一次通話倒數
- 行程階段顯示
- PWA，可加入 iPhone 主畫面
- Service Worker 離線快取
- GitHub Pages 自動部署 workflow

## 專案結構

```text
.
├─ index.html
├─ styles.css
├─ app.js
├─ manifest.webmanifest
├─ sw.js
├─ apple-touch-icon.png
├─ icon-192.png
├─ icon-512.png
├─ 404.html
├─ .nojekyll
├─ .gitignore
└─ .github/
   └─ workflows/
      └─ pages.yml
```

## 本機預覽

```bash
python -m http.server 8000
```

瀏覽器打開 `http://localhost:8000`。

## GitHub Pages 部署

### 建立 repository
建議名稱：

`hy-zy-long-distance`

把此資料夾內所有檔案放到 repository 根目錄，預設分支使用 `main`。

### 開啟 Pages
GitHub repository → **Settings → Pages**。

在 **Build and deployment → Source** 選擇：

`GitHub Actions`

之後每次 push 到 `main`，`.github/workflows/pages.yml` 都會自動部署。

### iPhone 加入主畫面
Safari 開啟 GitHub Pages 網址 → 分享 → **加入主畫面**。

之後會以獨立 App 模式開啟。

## 修改排程

主要設定集中在 `app.js` 最上方的 `CONFIG`，包含：

- Zi‑Yi 上班時間
- San Antonio 通話時段
- Los Angeles 通話時段
- 行程切換日期

不需要手動計算 UTC−5 / UTC−6 / UTC−8；程式使用：

- `Asia/Taipei`
- `America/Chicago`
- `America/Los_Angeles`

所以 DST 會自動處理。

## 隱私提醒

如果 repository 設為 **Public**，程式碼與其中的排程／行程日期也會公開。
如果你不想公開這些資訊，請優先使用 Private repository，並確認你的 GitHub Pages 方案是否支援從 Private repository 發佈；否則可以改用其他私密部署方式。
