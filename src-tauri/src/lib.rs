mod db;
mod api;

use anyhow::Result;
use std::path::PathBuf;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Initialize logging (called at startup)
fn init_logging() {
    #[cfg(debug_assertions)]
    {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Debug)
            .init();
    }

    #[cfg(not(debug_assertions))]
    {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Info)
            .init();
    }
}

/// Get the application data directory path
fn get_app_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir)
}

/// Get the database file path
fn get_database_path(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = get_app_data_dir(app_handle)?;
    Ok(app_data_dir.join("asset-manager.db"))
}

/// Setup database on application startup
fn setup_database_on_startup(app_handle: &tauri::AppHandle) -> Result<()> {
    let db_path = get_database_path(app_handle)?;
    log::info!("Setting up database at: {:?}", db_path);

    // Set global DB path for commands to use
    db::set_db_path(db_path.clone());

    db::setup_database(&db_path)?;
    log::info!("Database setup completed successfully");

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging first
    init_logging();
    log::info!("Application starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Setup database on application startup
            if let Err(e) = setup_database_on_startup(app.handle()) {
                log::error!("Failed to setup database: {}", e);
                eprintln!("Critical Error: Database setup failed!");
                eprintln!("Details: {}", e);
                // Optionally, you can exit the app here
                std::process::exit(1);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // Properties
            api::get_properties,
            api::get_property,
            api::create_property,
            api::update_property,
            api::delete_property,
            // Units
            api::get_units,
            api::create_unit,
            // Incomes
            api::get_incomes,
            api::create_income,
            api::update_income,
            // Expenses
            api::get_expenses,
            api::create_expense,
            api::update_expense,
            api::delete_expense,
            // Dashboard
            api::get_dashboard_summary,
        ])
        .build(tauri::generate_context!())
        .expect("error building tauri application")
        .run(|_app_handle, _event| {});
}
