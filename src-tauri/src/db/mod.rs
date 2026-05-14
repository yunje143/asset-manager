mod schema;
mod backup;

pub use schema::init_schema;
pub use backup::setup_backup;

use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::PathBuf;

/// Initialize database connection and perform setup
pub fn initialize_database(db_path: &PathBuf) -> Result<Connection> {
    // Create parent directories if they don't exist
    let parent = db_path
        .parent()
        .context("Failed to get parent directory of database")?;
    std::fs::create_dir_all(parent)
        .context("Failed to create database directory")?;

    // Create or open the database
    let conn = Connection::open(db_path)
        .context(format!("Failed to open database at {:?}", db_path))?;

    // Enable foreign keys for SQLite
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .context("Failed to enable foreign keys")?;

    Ok(conn)
}

/// Perform full database setup on application startup
pub fn setup_database(db_path: &PathBuf) -> Result<()> {
    log::info!("Starting database setup at {:?}", db_path);

    // Step 1: Ensure directory structure exists
    let app_data_dir = db_path
        .parent()
        .context("Failed to get app data directory")?;
    std::fs::create_dir_all(app_data_dir)
        .context("Failed to create app data directory")?;

    log::info!("App data directory created/verified: {:?}", app_data_dir);

    // Step 2: Create backup (if database already exists)
    if db_path.exists() {
        setup_backup(db_path).context("Failed to create backup")?;
        log::info!("Database backup created successfully");
    }

    // Step 3: Initialize/migrate database schema
    let conn = initialize_database(db_path)
        .context("Failed to initialize database connection")?;

    init_schema(&conn).context("Failed to initialize database schema")?;
    log::info!("Database schema initialized successfully");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_initialize_database_creates_directories() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("nested").join("db").join("asset.db");

        let conn = initialize_database(&db_path);

        assert!(conn.is_ok());
        assert!(db_path.exists());
    }

    #[test]
    fn test_setup_database_creates_tables() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("asset.db");

        let result = setup_database(&db_path);
        assert!(result.is_ok());
        assert!(db_path.exists());

        // Verify table creation
        let conn = Connection::open(&db_path).unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
            )
            .unwrap();

        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(!tables.is_empty(), "No tables were created");
    }
}
