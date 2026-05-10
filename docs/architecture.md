# Architecture Summary
プロジェクト名: asset-manager
形態: デスクトップアプリケーション (Tauri)

# Tech Stack
- **Framework**: Tauri (v2)
- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Data Visualization**: Tremor
- **Database**: SQLite (Local)
- **State Management**: React Query (推薦)

# Project Structure
- `src/`: Reactフロントエンド
- `src-tauri/`: RustバックエンドおよびSQLite統合
- `docs/`: 仕様・設計ドキュメント

# Design Policy
- ユーザーに配布する実行ファイル (exe等) のみで完結すること。
- 外部APIへの依存を最小限にし、ローカルでの計算・保存を優先する。
