# Database Setup Implementation Guide

## Overview
This document describes the rusqlite database setup implementation for asset-manager, including automatic backup, schema initialization, and error handling.

## Implementation Structure

### 1. Module Organization
```
src-tauri/src/
├── lib.rs                 # Application entry point, startup hooks
└── db/
    ├── mod.rs            # Database initialization and setup orchestration
    ├── schema.rs         # SQL schema definitions and table creation
    └── backup.rs         # Automatic backup and retention management
```

### 2. Startup Flow (Database Initialization)

The database setup occurs in this order during application startup:

#### Phase 1: Application Launch
- `main.rs` calls `asset_manager_lib::run()`
- Logging is initialized with environment-based log levels
  - Debug mode: `LevelFilter::Debug`
  - Release mode: `LevelFilter::Info`

#### Phase 2: Tauri Setup Hook
- Application setup handler is registered in `tauri::Builder`
- On startup, `setup_database_on_startup()` is called with `AppHandle`

#### Phase 3: Database Setup (Orchestrated in `db::setup_database()`)

**Step 1: Directory Preparation**
```rust
// Create app_data_dir if it doesn't exist
std::fs::create_dir_all(app_data_dir)?;
```
- Path: `{app_data_dir}/asset-manager.db`
- Automatic directory creation at multiple levels

**Step 2: Backup Creation (if database exists)**
```rust
if db_path.exists() {
    setup_backup(db_path)?;
}
```
- Backup file naming: `asset-manager_YYYYMMDD_HHMMSS.db`
- Stored in: `{app_data_dir}/backups/`
- Retention policy: Keep backups from last 7 days
- Automatic cleanup of older backups

**Step 3: Database Connection & Migration**
```rust
let conn = initialize_database(db_path)?;
init_schema(&conn)?;
```
- Opens or creates SQLite database
- Enables foreign key constraints
- Creates all required tables and indexes

### 3. Error Handling

**Graceful Degradation**
```rust
// In lib.rs setup hook
if let Err(e) = setup_database_on_startup(app.handle()) {
    log::error!("Failed to setup database: {}", e);
    eprintln!("Critical Error: Database setup failed!");
    eprintln!("Details: {}", e);
    std::process::exit(1);
}
```

Error categories handled:
- **Directory Creation Failures**: Reported with full path context
- **Backup Failures**: Logged but non-fatal (app continues, may warn user)
- **Database Connection Failures**: Logged as error, app exits
- **Schema Creation Failures**: Logged as error, app exits

### 4. Database Schema

#### Master Tables
- `properties`: Asset/property information
- `units`: Individual rental units or earning sources
- `loans`: Loan/mortgage information for properties

#### Transaction Tables
- `incomes`: Revenue records (rent, deposits, cleaning fees)
- `expenses`: Expense records (maintenance, taxes, utilities)
- `lease_contracts`: Active lease agreements
- `stay_records`: Airbnb/vacation rental records

#### Key Features
- All tables have `created_at` and `updated_at` timestamps
- Foreign key constraints enabled by default
- Indexes on frequently queried columns (date, IDs, status)
- Pending-first workflow support in `incomes` table

### 5. Backup Strategy

**Automatic Backup Execution**
```rust
pub fn setup_backup(db_path: &PathBuf) -> Result<()> {
    // 1. Create/ensure backups directory
    // 2. Copy database with timestamp: asset-manager_YYYYMMDD_HHMMSS.db
    // 3. Clean up backups older than 7 days
}
```

**Backup File Lifecycle**
1. Created during startup before schema migration
2. Named with timestamp for unique identification
3. Stored in app_data_dir/backups/ subdirectory
4. Automatically deleted when older than 7 days
5. User can manually copy for additional archival

### 6. Configuration

#### Dependencies (in Cargo.toml)
```toml
rusqlite = { version = "0.30", features = ["bundled", "chrono"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1"
log = "0.4"
env_logger = "0.11"
```

#### Feature Flags
- `bundled`: SQLite is bundled, no external dependency needed
- `chrono`: Support for timestamp operations

### 7. Testing

All modules include comprehensive unit tests:

**db/mod.rs**
- `test_initialize_database_creates_directories`: Verifies directory creation
- `test_setup_database_creates_tables`: Verifies full setup flow

**db/schema.rs**
- `test_init_schema_creates_all_tables`: Validates all 7 tables are created
- `test_foreign_keys_enabled`: Confirms foreign key support

**db/backup.rs**
- `test_backup_creates_timestamped_file`: Validates backup file naming
- `test_backup_file_contains_data`: Ensures backup content integrity
- `test_get_backup_directory`: Confirms backup path resolution

Run tests:
```bash
cargo test --lib
```

### 8. Logging & Diagnostics

**Log Levels**
- `ERROR`: Database setup failures (causes app exit)
- `INFO`: Successful operations (startup, backup creation, table creation)
- `DEBUG`: Detailed operation information (debug builds only)
- `WARN`: Recoverable issues (e.g., failed to delete old backup)

**Enable Debug Logging**
```bash
RUST_LOG=debug cargo run
```

## Usage

### Application Startup
```bash
cargo build --release
./target/release/asset-manager
```

Database is automatically:
1. Created at `~/.config/asset-manager/asset-manager.db` (or platform-equivalent)
2. Backed up on each launch
3. Schema migrated/verified

### Manual Database Backup
Users can manually create backups:
```bash
cp ~/.config/asset-manager/asset-manager.db ~/.config/asset-manager/asset-manager_manual_backup.db
```

### Database Recovery
If corruption occurs:
1. Locate latest backup in `backups/` directory
2. Copy backup file to `asset-manager.db`
3. Restart application

## Future Enhancements

1. **Migration Framework**: Support incremental schema versions
2. **Export/Import**: CSV export functionality for data portability
3. **Encryption**: Optional database encryption at rest
4. **Concurrent Access**: Multi-process safe locking mechanism
5. **Analytics**: Auto-generated usage statistics
