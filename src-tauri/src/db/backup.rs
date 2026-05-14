use anyhow::{Context, Result};
use chrono::Local;
use std::fs;
use std::path::PathBuf;

/// Backup directory name
const BACKUP_DIR_NAME: &str = "backups";

/// Maximum number of days to keep backups
const BACKUP_RETENTION_DAYS: i64 = 7;

/// Create timestamped backup of database file
pub fn setup_backup(db_path: &PathBuf) -> Result<()> {
    let backup_dir = get_backup_directory(db_path)?;

    // Ensure backup directory exists
    fs::create_dir_all(&backup_dir)
        .context("Failed to create backup directory")?;

    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("asset-manager_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    // Copy database file to backup
    fs::copy(db_path, &backup_path).context(format!(
        "Failed to copy database to backup: {:?}",
        backup_path
    ))?;

    log::info!("Database backed up to: {:?}", backup_path);

    // Clean up old backups
    cleanup_old_backups(&backup_dir)
        .context("Failed to clean up old backups")?;

    Ok(())
}

/// Get the backup directory path
fn get_backup_directory(db_path: &PathBuf) -> Result<PathBuf> {
    let parent = db_path
        .parent()
        .context("Failed to get parent directory of database")?;

    Ok(parent.join(BACKUP_DIR_NAME))
}

/// Remove backups older than retention period
fn cleanup_old_backups(backup_dir: &PathBuf) -> Result<()> {
    let now = Local::now();
    let cutoff_time = now.timestamp() - (BACKUP_RETENTION_DAYS * 86400);

    let entries = fs::read_dir(backup_dir)
        .context("Failed to read backup directory")?;

    let mut deleted_count = 0;

    for entry in entries {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "db") {
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified_time) = metadata.modified() {
                    if let Ok(elapsed) = modified_time.elapsed() {
                        let file_timestamp =
                            now.timestamp() - elapsed.as_secs() as i64;

                        if file_timestamp < cutoff_time {
                            match fs::remove_file(&path) {
                                Ok(_) => {
                                    log::info!(
                                        "Deleted old backup: {:?}",
                                        path
                                    );
                                    deleted_count += 1;
                                }
                                Err(e) => {
                                    log::warn!(
                                        "Failed to delete backup {:?}: {}",
                                        path,
                                        e
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if deleted_count > 0 {
        log::info!("Cleaned up {} old backups", deleted_count);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_backup_creates_timestamped_file() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let backup_dir = temp_dir.path().join(BACKUP_DIR_NAME);

        // Create a dummy database file
        fs::write(&db_path, "test data").unwrap();

        let result = setup_backup(&db_path);
        assert!(result.is_ok());

        // Check that backup directory exists and has a file
        assert!(backup_dir.exists());

        let entries: Vec<_> = fs::read_dir(&backup_dir)
            .unwrap()
            .map(|e| e.unwrap().path())
            .collect();

        assert_eq!(entries.len(), 1);
        assert!(entries[0]
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("asset-manager_"));
    }

    #[test]
    fn test_backup_file_contains_data() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let test_data = b"test database content";

        // Create a dummy database file
        fs::write(&db_path, test_data).unwrap();

        setup_backup(&db_path).unwrap();

        let backup_dir = temp_dir.path().join(BACKUP_DIR_NAME);
        let backup_file = fs::read_dir(&backup_dir)
            .unwrap()
            .next()
            .unwrap()
            .unwrap()
            .path();

        let backup_content = fs::read(&backup_file).unwrap();
        assert_eq!(backup_content, test_data);
    }

    #[test]
    fn test_get_backup_directory() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("data").join("test.db");

        let backup_dir = get_backup_directory(&db_path).unwrap();
        assert_eq!(
            backup_dir.file_name().unwrap().to_string_lossy().to_string(),
            BACKUP_DIR_NAME
        );
    }
}
