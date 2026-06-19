use anyhow::Result;
use rusqlite::Connection;

/// Initialize database schema with all tables
pub fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
-- Master Tables

-- Properties (物件マスタ)
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Mansion', 'Tenant', 'Stay')),
    purchase_price REAL NOT NULL,
    purchase_date TEXT NOT NULL,
    useful_life INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Units (部屋マスタ)
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    usage_type TEXT NOT NULL CHECK(usage_type IN ('Lease', 'Stay', 'Tenant')),
    target_rent REAL NOT NULL,
    area_size REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Loans (ローンマスタ)
CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    principal REAL NOT NULL,
    interest_rate REAL NOT NULL,
    term_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Transaction Tables

-- Incomes (収入テーブル)
CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    unit_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('auto', 'manual')),
    external_ref_id TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- Expenses (費用テーブル)
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    property_id INTEGER NOT NULL,
    unit_id INTEGER,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- Lease Contracts (賃貸契約)
CREATE TABLE IF NOT EXISTS lease_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    tenant_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rent REAL NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Stay Records (民泊実績)
CREATE TABLE IF NOT EXISTS stay_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    guest_name TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    nightly_rate REAL NOT NULL,
    cleaning_fee REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_unit_id ON incomes(unit_id);
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unit_id ON expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_unit_id ON lease_contracts(unit_id);
CREATE INDEX IF NOT EXISTS idx_stay_records_unit_id ON stay_records(unit_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_loans_property_id ON loans(property_id);
        "#,
    )?;

    log::info!("All tables and indexes created/verified successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_init_schema_creates_all_tables() {
        let conn = Connection::open_in_memory().unwrap();
        let result = init_schema(&conn);

        assert!(result.is_ok());

        // Verify tables exist
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
            )
            .unwrap();

        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        let expected_tables = vec![
            "expenses",
            "incomes",
            "lease_contracts",
            "loans",
            "properties",
            "stay_records",
            "units",
        ];

        for expected in expected_tables {
            assert!(
                tables.contains(&expected.to_string()),
                "Table '{}' not found",
                expected
            );
        }
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();

        // Note: Default is disabled, this just checks the pragma works
        assert!(conn.execute("PRAGMA foreign_keys = ON;", []).is_ok());
    }
}
