use crate::api::models::*;
use crate::db::get_connection;
use anyhow::Result;
use chrono::Local;
use rusqlite::{params, OptionalExtension};

// ===================== Properties Commands =====================

#[tauri::command]
pub async fn get_properties() -> Result<Vec<Property>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, address, type, purchase_price, purchase_date, useful_life, created_at, updated_at FROM properties ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let properties = stmt
        .query_map([], |row| {
            Ok(Property {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                property_type: row.get(3)?,
                purchase_price: row.get(4)?,
                purchase_date: row.get(5)?,
                useful_life: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(properties)
}

#[tauri::command]
pub async fn get_property(id: i64) -> Result<Option<Property>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, address, type, purchase_price, purchase_date, useful_life, created_at, updated_at FROM properties WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let property = stmt
        .query_row(params![id], |row| {
            Ok(Property {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                property_type: row.get(3)?,
                purchase_price: row.get(4)?,
                purchase_date: row.get(5)?,
                useful_life: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(property)
}

#[tauri::command]
pub async fn create_property(req: CreatePropertyRequest) -> Result<Property, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn
        .execute(
            "INSERT INTO properties (name, address, type, purchase_price, purchase_date, useful_life, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                req.name,
                req.address,
                req.property_type,
                req.purchase_price,
                req.purchase_date,
                req.useful_life,
                now,
                now
            ],
        )
        .map_err(|e| format!("Failed to insert property: {}", e))?;

    let inserted_id = conn.last_insert_rowid();

    get_property(inserted_id)
        .await
        .map_err(|e| format!("Failed to retrieve created property: {}", e))?
        .ok_or_else(|| "Property not found after creation".to_string())
}

#[tauri::command]
pub async fn update_property(id: i64, req: CreatePropertyRequest) -> Result<Property, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE properties SET name = ?1, address = ?2, type = ?3, purchase_price = ?4, purchase_date = ?5, useful_life = ?6, updated_at = ?7 WHERE id = ?8",
        params![
            req.name,
            req.address,
            req.property_type,
            req.purchase_price,
            req.purchase_date,
            req.useful_life,
            now,
            id
        ],
    )
    .map_err(|e| format!("Failed to update property: {}", e))?;

    get_property(id)
        .await
        .map_err(|e| format!("Failed to retrieve updated property: {}", e))?
        .ok_or_else(|| "Property not found after update".to_string())
}

#[tauri::command]
pub async fn delete_property(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM properties WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete property: {}", e))?;

    Ok(())
}

// ===================== Units Commands =====================

#[tauri::command]
pub async fn get_units(property_id: Option<i64>) -> Result<Vec<Unit>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let query = if property_id.is_some() {
        "SELECT id, property_id, room_number, usage_type, target_rent, area_size, created_at, updated_at FROM units WHERE property_id = ?1 ORDER BY room_number"
    } else {
        "SELECT id, property_id, room_number, usage_type, target_rent, area_size, created_at, updated_at FROM units ORDER BY property_id, room_number"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let units = if let Some(prop_id) = property_id {
        stmt.query_map(params![prop_id], parse_unit_row)
    } else {
        stmt.query_map([], parse_unit_row)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(units)
}

fn parse_unit_row(row: &rusqlite::Row) -> rusqlite::Result<Unit> {
    Ok(Unit {
        id: row.get(0)?,
        property_id: row.get(1)?,
        room_number: row.get(2)?,
        usage_type: row.get(3)?,
        target_rent: row.get(4)?,
        area_size: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

#[tauri::command]
pub async fn create_unit(req: CreateUnitRequest) -> Result<Unit, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO units (property_id, room_number, usage_type, target_rent, area_size, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            req.property_id,
            req.room_number,
            req.usage_type,
            req.target_rent,
            req.area_size,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to insert unit: {}", e))?;

    let unit_id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare("SELECT id, property_id, room_number, usage_type, target_rent, area_size, created_at, updated_at FROM units WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![unit_id], parse_unit_row)
        .map_err(|e| format!("Failed to retrieve created unit: {}", e))
}

// ===================== Incomes Commands =====================

#[tauri::command]
pub async fn get_incomes(unit_id: Option<i64>) -> Result<Vec<Income>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let query = if unit_id.is_some() {
        "SELECT id, date, amount, category, unit_id, status, source_type, external_ref_id, note, created_at, updated_at FROM incomes WHERE unit_id = ?1 ORDER BY date DESC"
    } else {
        "SELECT id, date, amount, category, unit_id, status, source_type, external_ref_id, note, created_at, updated_at FROM incomes ORDER BY date DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let incomes = if let Some(u_id) = unit_id {
        stmt.query_map(params![u_id], parse_income_row)
    } else {
        stmt.query_map([], parse_income_row)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(incomes)
}

fn parse_income_row(row: &rusqlite::Row) -> rusqlite::Result<Income> {
    Ok(Income {
        id: row.get(0)?,
        date: row.get(1)?,
        amount: row.get(2)?,
        category: row.get(3)?,
        unit_id: row.get(4)?,
        status: row.get(5)?,
        source_type: row.get(6)?,
        external_ref_id: row.get(7)?,
        note: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

#[tauri::command]
pub async fn create_income(req: CreateIncomeRequest) -> Result<Income, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let status = req.status.unwrap_or_else(|| "pending".to_string());

    conn.execute(
        "INSERT INTO incomes (date, amount, category, unit_id, status, source_type, note, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            req.date,
            req.amount,
            req.category,
            req.unit_id,
            status,
            "manual",
            req.note,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to insert income: {}", e))?;

    let income_id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare("SELECT id, date, amount, category, unit_id, status, source_type, external_ref_id, note, created_at, updated_at FROM incomes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![income_id], parse_income_row)
        .map_err(|e| format!("Failed to retrieve created income: {}", e))
}

#[tauri::command]
pub async fn update_income(id: i64, req: CreateIncomeRequest) -> Result<Income, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let status = req.status.unwrap_or_else(|| "pending".to_string());

    conn.execute(
        "UPDATE incomes SET date = ?1, amount = ?2, category = ?3, unit_id = ?4, status = ?5, note = ?6, updated_at = ?7 WHERE id = ?8",
        params![
            req.date,
            req.amount,
            req.category,
            req.unit_id,
            status,
            req.note,
            now,
            id
        ],
    )
    .map_err(|e| format!("Failed to update income: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, date, amount, category, unit_id, status, source_type, external_ref_id, note, created_at, updated_at FROM incomes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], parse_income_row)
        .map_err(|e| format!("Failed to retrieve updated income: {}", e))
}

// ===================== Dashboard Commands =====================

#[tauri::command]
pub async fn get_dashboard_summary() -> Result<DashboardSummary, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    // Get total properties and units
    let total_properties: i32 = conn
        .query_row("SELECT COUNT(*) FROM properties", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let total_units: i32 = conn
        .query_row("SELECT COUNT(*) FROM units", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Get current month's income and expenses
    let current_month = Local::now().format("%Y-%m-").to_string();

    let total_income_this_month: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE date LIKE ?1",
            params![format!("{}%", current_month)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_expense_this_month: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date LIKE ?1",
            params![format!("{}%", current_month)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get total asset value
    let total_asset_value: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(purchase_price), 0) FROM properties",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get property summaries
    let mut stmt = conn
        .prepare(
            "SELECT id, name, address, type, purchase_price FROM properties ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let properties = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, f64>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut property_summaries = Vec::new();

    for (prop_id, name, address, prop_type, purchase_price) in properties {
        let units_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM units WHERE property_id = ?1", params![prop_id], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        let monthly_income: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(i.amount), 0) FROM incomes i JOIN units u ON i.unit_id = u.id WHERE u.property_id = ?1 AND i.date LIKE ?2",
                params![prop_id, format!("{}%", current_month)],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let monthly_expense: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE property_id = ?1 AND date LIKE ?2",
                params![prop_id, format!("{}%", current_month)],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let net_yield_percent = if purchase_price > 0.0 {
            ((monthly_income - monthly_expense) / purchase_price) * 100.0 * 12.0
        } else {
            0.0
        };

        property_summaries.push(PropertySummary {
            id: prop_id,
            name,
            address,
            property_type: prop_type,
            purchase_price,
            monthly_income,
            monthly_expense,
            net_yield_percent,
            units_count,
        });
    }

    // Calculate weighted yield
    let weighted_yield_percent = if total_asset_value > 0.0 {
        (property_summaries
            .iter()
            .map(|p| (p.purchase_price * p.net_yield_percent) / 100.0)
            .sum::<f64>() / total_asset_value) * 100.0
    } else {
        0.0
    };

    Ok(DashboardSummary {
        total_properties,
        total_units,
        total_income_this_month,
        total_expense_this_month,
        total_asset_value,
        weighted_yield_percent,
        properties: property_summaries,
    })
}

// ===================== Expenses Commands =====================

#[tauri::command]
pub async fn get_expenses(property_id: Option<i64>) -> Result<Vec<Expense>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let query = if property_id.is_some() {
        "SELECT id, date, amount, category, property_id, unit_id, note, created_at, updated_at FROM expenses WHERE property_id = ?1 ORDER BY date DESC"
    } else {
        "SELECT id, date, amount, category, property_id, unit_id, note, created_at, updated_at FROM expenses ORDER BY date DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let expenses = if let Some(p_id) = property_id {
        stmt.query_map(params![p_id], parse_expense_row)
    } else {
        stmt.query_map([], parse_expense_row)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(expenses)
}

fn parse_expense_row(row: &rusqlite::Row) -> rusqlite::Result<Expense> {
    Ok(Expense {
        id: row.get(0)?,
        date: row.get(1)?,
        amount: row.get(2)?,
        category: row.get(3)?,
        property_id: row.get(4)?,
        unit_id: row.get(5)?,
        note: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub async fn create_expense(req: CreateExpenseRequest) -> Result<Expense, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO expenses (date, amount, category, property_id, unit_id, note, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            req.date,
            req.amount,
            req.category,
            req.property_id,
            req.unit_id,
            req.note,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to insert expense: {}", e))?;

    let expense_id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare("SELECT id, date, amount, category, property_id, unit_id, note, created_at, updated_at FROM expenses WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![expense_id], parse_expense_row)
        .map_err(|e| format!("Failed to retrieve created expense: {}", e))
}

#[tauri::command]
pub async fn update_expense(id: i64, req: CreateExpenseRequest) -> Result<Expense, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE expenses SET date = ?1, amount = ?2, category = ?3, property_id = ?4, unit_id = ?5, note = ?6, updated_at = ?7 WHERE id = ?8",
        params![
            req.date,
            req.amount,
            req.category,
            req.property_id,
            req.unit_id,
            req.note,
            now,
            id
        ],
    )
    .map_err(|e| format!("Failed to update expense: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, date, amount, category, property_id, unit_id, note, created_at, updated_at FROM expenses WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], parse_expense_row)
        .map_err(|e| format!("Failed to retrieve updated expense: {}", e))
}

#[tauri::command]
pub async fn delete_expense(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
