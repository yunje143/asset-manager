# アーキテクチャ

## 構成図（データフロー）

```
Google Sheets (transactions, ticker_map)
        │  gspread (@st.cache_data ttl=600)
        ▼
  lib/sheets_client.py
        │
        ▼
  lib/calculations.py ──── lib/market_data.py ── yfinance (@st.cache_data ttl=86400)
        │                        (株式ティッカーのみ)
        ▼
  lib/charts.py (Altair / echarts option)
        │
        ▼
  app.py / pages/*.py (レンダリングのみ)
```

## ファイル構成

```
app.py                # エントリポイント。st.navigation() によるページルーターのみを持つ
pages/
  total.py             # 総合
  real_estate.py        # 不動産
  bond.py                # 社債
  stock.py               # 株式
lib/
  config.py           # secrets/env 解決
  sheets_client.py     # gspread クライアント・キャッシュ付きロード
  market_data.py       # yfinance 取得（OHLC）・キャッシュ・価格差分計算
  period.py            # 期間フィルターの定義とロジック
  calculations.py      # カテゴリ別集計（純粋関数、Streamlit非依存）
  charts.py            # Altair / echarts のビルダー
  ui_helpers.py         # ページ共通のUI部品・エラーハンドリング・フォーマッター
  schema.py             # 期待カラム定義
docs/                  # 本ドキュメント
```

**レイヤールール**: `calculations.py` と `period.py` は pandas のみに依存する純粋関数（Streamlit 呼び出しなし）。IO とキャッシュは `sheets_client.py` / `market_data.py` に閉じる。`pages/*.py` は「読み込み→フィルター→集計→チャート→描画」の薄い流れのみを持つ。

## 画面ナビゲーション

`app.py` は `st.navigation()` + `st.Page()` でページ一覧・タイトル（日本語）・アイコン（`:material/xxx:` の Material Symbols）を明示的に定義し、実体は `pages/*.py` に置く構成にしている（Streamlit の `pages/` ディレクトリによるファイル名ベースの自動ナビゲーションは使っていない）。`st.set_page_config()` はページごとではなく `app.py` で1回だけ呼ぶ（`st.navigation` 使用時のルール）。

```python
pages = [
    st.Page("pages/total.py", title="総合", icon=":material/dashboard:", default=True),
    st.Page("pages/real_estate.py", title="不動産", icon=":material/apartment:"),
    st.Page("pages/bond.py", title="社債", icon=":material/account_balance:"),
    st.Page("pages/stock.py", title="株式", icon=":material/trending_up:"),
]
st.navigation(pages).run()
```

各ページ内の `st.header()` / `st.subheader()` にも同じ調子で `:material/xxx:` アイコンを付けている（例: 資金の流れ = `:material/account_tree:`、ローソク足セクション = `:material/candlestick_chart:`）。

## キャッシュ戦略

- **gspread**: `_get_gspread_client()` は `@st.cache_resource`（認証情報はpickle不可なため `cache_data` ではなく `cache_resource`）。`load_transactions()` / `load_ticker_map()` は `@st.cache_data(ttl=600)`。
- **yfinance**: `fetch_market_prices(tickers)` は `@st.cache_data(ttl=86400)`。株式カテゴリのティッカーのみ取得し、社債は呼び出し元で除外する。ティッカーごとに try/except し、失敗銘柄は個別に返して1銘柄の失敗が全体をブロックしないようにしている。

## secrets / 認証（Application Default Credentials、鍵ファイル不要）

ホスティング先を **Cloud Run に確定**したことに合わせ、サービスアカウントの鍵ファイル（JSON）は一切発行・保存しない設計にしている。`lib/sheets_client.py::_get_gspread_client()` は `google.auth.default(scopes=SCOPES)` で認証情報を取得する（Application Default Credentials, ADC）。

- **Cloud Run 上**: サービスアカウントをサービスに直接アタッチする（`gcloud run deploy --service-account=<SA email>`）。コンテナ内から `google.auth.default()` を呼ぶと、Cloud Run のメタデータサーバーが自動的に短命トークンを発行する。鍵は存在しないため漏洩リスクそのものがない。
- **ローカル開発**: 事前に一度だけ以下を実行しておく（鍵は作らず、自分のログインでサービスアカウントを一時的に代行する仕組み）。
  ```
  gcloud iam service-accounts add-iam-policy-binding <SA email> \
    --member="user:<自分のGoogleアカウント>" \
    --role="roles/iam.serviceAccountTokenCreator"

  gcloud auth application-default login --impersonate-service-account=<SA email>
  ```
  これで `google.auth.default()` がローカルでも同じ認証情報を返すようになる。

`SPREADSHEET_ID` は機密情報ではないが、`lib/config.py::get_spreadsheet_id()` が `st.secrets["sheets"]["spreadsheet_id"]`（ローカル）またはは環境変数 `SPREADSHEET_ID`（Cloud Run: `--set-env-vars`）から解決する。`.streamlit/secrets.toml.example` に必要なキーを記載している。

## デプロイ（Cloud Run）

- `Dockerfile`: `python:3.11-slim` ベース。Cloud Run が動的に注入する `$PORT` 環境変数をシェル形式 CMD で展開して `streamlit run` を起動する。
- デプロイ例:
  ```
  gcloud run deploy asset-manager \
    --source . \
    --service-account=<SA email> \
    --set-env-vars=SPREADSHEET_ID=<spreadsheet id> \
    --region=asia-northeast1
  ```
- 公開URLへのアクセス制御は Cloud Run 自体では行わず、後述の Cloudflare Access に委ねる想定（`--allow-unauthenticated` でデプロイし、Cloudflare 側で許可アカウントを絞る）。

## Cloudflare Access（インフラ設定・コード外）

デプロイ後のホスト名に Cloudflare の DNS レコード（プロキシ有効）を向け、そのホスト名に対して Cloudflare Access アプリケーションを作成し、Google を IdP として許可するアカウントのメールアドレスをポリシーに指定する。アプリケーション側には認証コードを実装していない（Access が前段でブロックする前提）。この設定は Cloudflare ダッシュボード側で行うインフラ作業であり、リポジトリのコードには含まれない。

## エラーハンドリング方針

- Google Sheets 読み込み失敗（認証エラー・API エラー・シート未検出）: `sheets_client.DataLoadError` / `config.ConfigError` を各ページ冒頭で捕捉し、`st.error()` + `st.stop()` で明確なメッセージを表示して停止する。
- `transactions` が空: オンボーディング用の `st.info()` を表示して停止する。
- ページ描画中の想定外のエラー: `ui_helpers.run_page()` が `main()` 全体を try/except で包み、`st.error("ページの表示中にエラーが発生しました。")` を表示する。スタックトレースは `APP_DEBUG` 環境変数（または `st.secrets["app"]["debug"]`）が true のときのみ `st.exception()` で表示し、デプロイ環境で外部に漏らさない。
- yfinance の個別銘柄取得失敗: 失敗銘柄のみ `market_value = N/A` とし、`st.warning()` で一覧表示する。
- `ticker_map` に未登録の資産: 保有数量・簿価は表示するが評価額は N/A とし、未マッピング銘柄を警告表示する。
