# 資産管理 BI ツール 仕様書 (spec.md)

## 1. 概要・目的
本システムは、不動産（テナント）、社債、株式の取引履歴および市場データ（yfinance）を統合し、全資産の状況およびカテゴリごとの推移をリアルタイムに可視化する Streamlit ベースの BI ツールである。

---

## 2. システム構成 & インフラ設計

### 2.1 技術スタック
- **Frontend / Dashboard**: Streamlit
- **Data Processing**: Pandas, NumPy
- **Visualization**: Altair, st-echarts
- **Data Integration**: gspread (Google Spreadsheet API), yfinance
- **Container**: Docker

### 2.2 インフラ & デプロイ
- **ホスティング**: Docker コンテナ化し、無料/格安コンテナサービス（GCP Cloud Run, Render, Fly.io 等）へデプロイ。
- **認証 & セキュリティ**: アプリの手前に **Cloudflare Zero Trust (Cloudflare Access)** を配置。指定された Google アカウント（メールアドレス）のみアクセスを許可する。

---

## 3. データ仕様（データモデル）

### 3.1 `transactions` (Google Spreadsheet から直接取得)
Google API (`gspread`) を通じて直接読み込み、`event_date` を datetime 型へ変換する。

| カラム名 | 型 | 説明 | 例 |
| :--- | :--- | :--- | :--- |
| `row_id` | Integer | ユニークID | `1` |
| `asset_name` | String | 資産名・物件名・銘柄名 | `S&P500`, `物件A` |
| `category` | String | 大分類 (`tenant`, `stock`, `bond`) | `stock` |
| `event_date` | Date | 取引発生日 (YYYY-MM-DD) | `2024-08-15` |
| `transaction_type` | String | 取引種別 (`income`, `expense`) | `expense` |
| `sub_category` | String | 小分類 (`purchase`, `rent`, `repair` 等) | `purchase` |
| `amount` | Float | 決済金額（収入は正、購入/費用は負） | `-50000` |
| `quantity` | Float | 数量（株式・社債の買付数/口数。不動産は0） | `10.5` |

### 3.2 `market_price` (yfinance から取得・内部生成)
`transactions` 内の `stock` / `bond` 銘柄（Ticker）に基づき、yfinance から過去 24 ヶ月分の日次データを自動取得・一元管理する（必要に応じて `@st.cache_data` によるキャッシュを利用）。

| カラム名 | 型 | 説明 | 例 |
| :--- | :--- | :--- | :--- |
| `date` | Date | 日付 (YYYY-MM-DD) | `2026-07-23` |
| `asset_name` | String | 資産名（マッピング用） | `S&P500` |
| `ticker` | String | yfinance 銘柄コード | `^GSPC` |
| `close_price` | Float | 終値（現在値） | `5850.00` |

---

## 4. 機能 & 計算ロジック仕様

### 4.1 全般
- **期間フィルター (Sidebar)**: 
  `1 Month`, `3 Months`, `6 Months`, `12 Months`, `24 Months`, `All Time` を選択可能とし、すべてのグラフ・表の集計範囲を連動させる。

### 4.2 カテゴリ別集計ルール
1. **不動産 (`category == 'tenant'`)**
   - **収入 / 費用**: `transaction_type` または `amount` の正負（正＝収入、負＝費用）で分類。
   - **集計**: 月別の「収入・費用・純利益」のトレンド、および物件（`asset_name`）ごとの累積比較。
2. **社債 & 株式 (`category in ['bond', 'stock']`)**
   - **保有数量 (Quantity)**: 対象銘柄の `quantity` の絶対値累計。
   - **取得コスト (Cost Basis)**: 購入時の `amount` の絶対値累計。
   - **評価額 (Market Value)**: `close_price`（最新株価） × `保有数量`
   - **評価損益 / 損益%**: 評価額 − 取得コスト、および `(評価額 - 取得コスト) / 取得コスト * 100`

---

## 5. 画面構成 (UI/UX)

### 5.1 Total Overview (`st.header("Total")`)
- **col1 (Total Amount)**: 
  全カテゴリの総金額・評価額の合計値、期間変化率 (Delta)、月別収入推移のスパークラインチャート（`st.metric`）。
- **col2 (Asset Distribution)**: 
  カテゴリ別（不動産、社債、株式）の資産保有比率を示すドーナツグラフ（`st-echarts`）。

### 5.2 Real Estate Trend Overview (`st.header("Real Estate")`)
- **col1 (Amount Chart)**: 
  月別の「収入（バー）」「費用（バー）」「累計純収支（折れ線）」の複合チャート（`Altair`）。
- **col2 (Income/Expense Chart)**: 
  物件（`asset_name`）ごとの「収入 vs 費用」比較横棒グラフ（`Altair`）。

### 5.3 Bond Overview (`st.header("Bond")`)
- **container1 (Summary)**: 
  全社債の評価額合計、前日比、前月比、および評価額推移折れ線チャート（`st.metric`, `st.line_chart`）。
- **container2 (Details Table)**: 
  社債ごとの明細テーブル（`銘柄名`, `現在値`, `前日比`, `前月比`, `評価額`, `評価損益`）。

### 5.4 Stock Overview (`st.header("Stock")`)
- **container1 (Summary)**: 
  全株式の評価額合計、前日比、前月比、および評価額推移折れ线チャート（`st.metric`, `st.line_chart`）。
- **container2 (Details Table)**: 
  株式ごとの明細テーブル（`銘柄名`, `現在値`, `前日比`, `前月比`, `評価額`, `評価損益`）。
