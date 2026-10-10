# データモデル

## 1. `transactions`（Google スプレッドシート、`gspread` で直接取得）

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

読み込み後、`event_date` は datetime 型に変換し、`amount`/`quantity`/`row_id` は数値型に変換する（`lib/sheets_client.py::load_transactions()`）。

## 2. `ticker_map`（新設タブ、`asset_name` に紐づく銘柄メタデータ）

`transactions` には `ticker` カラムがない（SPEC 3.1 に忠実）。`asset_name → ticker` は取引ごとに変わらない安定した対応関係のため、`transactions` と同じスプレッドシートに別タブとして新設する。株式・社債それぞれで使うカラムが異なる（片方は空欄でよい）。

| カラム名 | 型 | 説明 | 例 |
| :--- | :--- | :--- | :--- |
| `asset_name` | String | `transactions.asset_name` と一致させる | `S&P500`, `us1` |
| `ticker` | String | yfinance 銘柄コード（**株式のみ**、社債は空欄） | `^GSPC` |
| `maturity_date` | Date | 償還期限（**社債のみ**、株式は空欄） | `2036-01-10` |
| `coupon_rate` | Float | 表面利率（年率%、**社債のみ**、株式は空欄） | `0.8` |

- 株式は `ticker` のみ登録する（社債は時価評価しないため不要）。
- 社債は `maturity_date` / `coupon_rate` を登録する。これらは表示用の付加情報であり、時価評価には使わない（累計受取クーポンは実際の入金取引から計算する。下記4.参照）。
- 未登録の株式資産は保有数量・簿価は表示されるが、評価額は N/A になる。

## 3. `market_price`（yfinance から取得・内部生成、キャッシュのみ・シートには保存しない）

`ticker_map` に登録された株式ティッカーに基づき、yfinance から過去24ヶ月分の日次データを取得する（`lib/market_data.py::fetch_market_prices()`、`@st.cache_data(ttl=86400)`）。

| カラム名 | 型 | 説明 | 例 |
| :--- | :--- | :--- | :--- |
| `date` | Date | 日付 (YYYY-MM-DD) | `2026-07-23` |
| `ticker` | String | yfinance 銘柄コード | `^GSPC` |
| `open_price` | Float | 始値 | `5820.00` |
| `high_price` | Float | 高値 | `5860.00` |
| `low_price` | Float | 安値 | `5810.00` |
| `close_price` | Float | 終値 | `5850.00` |

`open_price`/`high_price`/`low_price` はStockページのローソク足チャート専用で、保有評価額の計算には`close_price`のみを使用する。`asset_name` は `attach_tickers()` / `holdings_summary()` 側で `ticker_map` と結合して補完する（キャッシュされた取得関数自体には含めない）。

## 4. 社債（`category == "bond"`）の扱い

社債は yfinance で個別銘柄の時価を取得できないため、`market_price` の対象外。`transactions` の `amount`（購入時は負値）の絶対値累計を簿価として扱い、時価評価・評価損益は計算しない（詳細は `docs/requirements.md` 3.1 を参照）。

代わりに、国債・社債のような償還期限付き商品であることが分かるよう、以下の情報を表示する（`lib/calculations.py::_attach_bond_details()`、Bondページ）。

- **償還期限・表面利率**: `ticker_map` の `maturity_date` / `coupon_rate` から取得する固定のメタ情報
- **残存期間**: `maturity_date` と現在日時から都度計算する表示専用の値（`ui_helpers.format_remaining_period()`）
- **累計受取クーポン**: 理論値（利率 × 経過期間）ではなく、`transactions` に記録された実際の入金取引（`amount > 0` の行、例: `sub_category = coupon`）の合計。実際の取引ログから積み上げる方針を保つため。
