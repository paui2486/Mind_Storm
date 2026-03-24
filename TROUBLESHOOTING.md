# 開發環境除錯筆記 (Troubleshooting)

## 問題：前端 Vite 伺服器已啟動，但 `localhost:5173` 無法連線

### 症狀 (Symptoms)
- 在終端機看到 Vite 提示 `➜ Local: http://localhost:5173/`。
- 但是在瀏覽器輸入 `http://localhost:5173/` 卻顯示「無法連線」或連線遭拒。
- `curl -I http://127.0.0.1:5173/` 回傳 `Failed to connect`。

### 根本原因 (Root Cause)
現代的 Node.js 與 Vite 預設會優先綁定 (bind) 到 IPv6 位址 (`::` 或 `::1`)。
當你的作業系統或瀏覽器的 `localhost` 被解析為 IPv4 (`127.0.0.1`)，但伺服器卻只監聽在 IPv6 時，就會發生連線失敗。
（可以使用 `lsof -i :5173` 檢查，如果只看到 `IPv6 TCP *:5173 (LISTEN)`，就代表出現此問題）。

### 解決方案 (Solutions)

#### 方法一：強制綁定 IPv4 (推薦)
在啟動 Vite 時，明確指定使用 IPv4 的 host (`127.0.0.1`)。這樣可保證所有只支援 IPv4 的網路請求也能成功。
**指令：**
```bash
# 使用 npx
npx vite --host 127.0.0.1 --port 5173

# 如果在 package.json 中設定，可以改寫為：
"scripts": {
  "dev": "vite --host 127.0.0.1"
}
```

#### 方法二：在瀏覽器改用精確的 IP
如果不想修改啟動指令，並且知道伺服器實際上綁定在哪，可以在瀏覽器中避開 `localhost` 模糊的 DNS 解析，直接使用具體的 IP。
- 嘗試：`http://127.0.0.1:5173/` (如果它其實有綁到 IPv4)
- 嘗試：`http://[::1]:5173/` (強制透過 IPv6 存取本機)

#### 方法三：修改 Vite 設定檔 (`vite.config.js`)
一勞永逸地在專案的 `vite.config.js` 寫死 host 行為：
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '127.0.0.1', // 強制使用 IPv4
    port: 5173
  }
})
```

---
*筆記建立時間：2026-03-24*
