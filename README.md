# 資産管理 BI ツール

不動産（テナント）・社債・株式の取引履歴と市場データ（yfinance）を統合し、資産状況とカテゴリ別推移を可視化する Streamlit 製 BI ダッシュボード。

## 画面

| 画面 | 内容 |
| :--- | :--- |
| :material/dashboard: 総合 | 収支サマリー（純資産評価額・総収入・総費用・純額）、資産配分ドーナツ、資産構成の推移、資金の流れ（Sankey） |
| :material/apartment: 不動産 | 月次収入・費用、累計純収支の推移、物件別収入 vs 費用 |
| :material/account_balance: 社債 | 簿価合計・累計受取クーポン、償還までの残存期間、銘柄別明細 |
| :material/trending_up: 株式 | 評価額合計・前日比・前月比、評価額推移、銘柄別ローソク足チャート |

サイドバーの期間フィルターは推移グラフ・期間比較デルタにのみ適用され、保有数量・簿価・評価額などの現在値は常に全期間で集計される（詳細は [docs/requirements.md](docs/requirements.md) の設計判断を参照）。

## 技術スタック

- **UI**: Streamlit, Altair, streamlit-echarts
- **データ**: Google スプレッドシート（gspread）、yfinance
- **認証**: Google Application Default Credentials（サービスアカウント鍵ファイル不要）
- **ホスティング**: Docker → Cloud Run、Cloudflare Access によるアクセス制御

詳細な設計は [docs/](docs/) 配下を参照。

- [docs/requirements.md](docs/requirements.md) — 要件・確定した設計判断
- [docs/architecture.md](docs/architecture.md) — 構成図・ファイル構成・ナビゲーション・キャッシュ戦略・デプロイ手順
- [docs/database.md](docs/database.md) — `transactions` / `ticker_map` / `market_price` のデータモデル

## セットアップ（ローカル開発）

### 1. 依存関係のインストール

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Google Cloud 認証（ADC）

サービスアカウントの鍵ファイルは発行せず、Application Default Credentials（ADC）で認証する。

```bash
gcloud iam service-accounts add-iam-policy-binding <SA email> \
  --member="user:<自分のGoogleアカウント>" \
  --role="roles/iam.serviceAccountTokenCreator"

gcloud auth application-default login --impersonate-service-account=<SA email>
```

### 3. secrets の設定

```bash
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
```

`spreadsheet_id` に実際のスプレッドシートIDを設定する。スプレッドシートには `transactions` シートと `ticker_map` シートを用意する（カラム定義は [docs/database.md](docs/database.md) を参照）。

### 4. 起動

```bash
streamlit run app.py
```

## デプロイ（Cloud Run）

```bash
gcloud run deploy asset-manager \
  --source . \
  --service-account=<SA email> \
  --set-env-vars=SPREADSHEET_ID=<spreadsheet id> \
  --region=asia-northeast1
```

公開後、Cloudflare Access でアクセスを許可する Google アカウントを限定する（手順は [docs/architecture.md](docs/architecture.md) を参照）。
