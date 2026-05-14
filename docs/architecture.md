# Architecture Summary
プロジェクト名: asset-manager
形態: デスクトップアプリケーション (Tauri)

# Tech Stack
- **Framework**: Tauri (v2)
- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Data Visualization**: Tremor
- **State Management**: React Query (推薦)
- **Database**: SQLite
- **Rust Library**: `rusqlite`
  - 選定理由: 型安全な操作、SQLの直接制御、および複雑なBI集計ロジックをバックエンド(Rust)に集約するため。

# Project Structure
- `src/`: Reactフロントエンド
- `src-tauri/`: RustバックエンドおよびSQLite統合
- `docs/`: 仕様・設計ドキュメント

# Design Policy
- ユーザーに配布する実行ファイル (exe等) のみで完結すること。
- 外部APIへの依存を最小限にし、ローカルでの計算・保存を優先する。

# Backup Strategy
- **自動バックアップ**: 
  - アプリ起動時に、メインの `.db` ファイルを `backups/` フォルダへコピーする。
  - ファイル名は `asset-manager_YYYYMMDD_HHMMSS.db` 形式とする。
- **世代管理**: 
  - 直近の7日間（または指定回数）のバックアップを保持し、古いものは自動削除する。
- **ポータビリティ**: 
  - ユーザーが手動で `.db` ファイルをコピー・移動することでデータの移行・復元が可能な設計とする。
