use serde::{Deserialize, Serialize};

// Property (物件)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Property {
    pub id: i64,
    pub name: String,
    pub address: String,
    #[serde(rename = "type")]
    pub property_type: String, // Mansion, Tenant, Stay
    pub purchase_price: f64,
    pub purchase_date: String,
    pub useful_life: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePropertyRequest {
    pub name: String,
    pub address: String,
    #[serde(rename = "type")]
    pub property_type: String,
    pub purchase_price: f64,
    pub purchase_date: String,
    pub useful_life: i32,
}

// Unit (部屋)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Unit {
    pub id: i64,
    pub property_id: i64,
    pub room_number: String,
    pub usage_type: String, // Lease, Stay, Tenant
    pub target_rent: f64,
    pub area_size: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUnitRequest {
    pub property_id: i64,
    pub room_number: String,
    pub usage_type: String,
    pub target_rent: f64,
    pub area_size: f64,
}

// Income (収入)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Income {
    pub id: i64,
    pub date: String,
    pub amount: f64,
    pub category: String,
    pub unit_id: Option<i64>,
    pub status: String, // pending, completed
    pub source_type: String, // auto, manual
    pub external_ref_id: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateIncomeRequest {
    pub date: String,
    pub amount: f64,
    pub category: String,
    pub unit_id: Option<i64>,
    pub status: Option<String>,
    pub note: Option<String>,
}

// Expense (費用)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub date: String,
    pub amount: f64,
    pub category: String,
    pub property_id: i64,
    pub unit_id: Option<i64>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub date: String,
    pub amount: f64,
    pub category: String,
    pub property_id: i64,
    pub unit_id: Option<i64>,
    pub note: Option<String>,
}

// Loan (ローン)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Loan {
    pub id: i64,
    pub property_id: i64,
    pub principal: f64,
    pub interest_rate: f64,
    pub term_months: i32,
    pub start_date: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLoanRequest {
    pub property_id: i64,
    pub principal: f64,
    pub interest_rate: f64,
    pub term_months: i32,
    pub start_date: String,
}

// Dashboard Summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub total_properties: i32,
    pub total_units: i32,
    pub total_income_this_month: f64,
    pub total_expense_this_month: f64,
    pub total_asset_value: f64,
    pub weighted_yield_percent: f64,
    pub properties: Vec<PropertySummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertySummary {
    pub id: i64,
    pub name: String,
    pub address: String,
    pub property_type: String,
    pub purchase_price: f64,
    pub monthly_income: f64,
    pub monthly_expense: f64,
    pub net_yield_percent: f64,
    pub units_count: i32,
}

// API Error Response
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
    pub details: Option<String>,
}

impl ApiError {
    pub fn new(error: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            details: None,
        }
    }

    pub fn with_details(error: impl Into<String>, details: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            details: Some(details.into()),
        }
    }
}

// Forecast Data for Analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyForecastData {
    pub month: String, // "2024-01", "2024-02", etc.
    pub income: f64,
    pub expense: f64,
    pub net_cash_flow: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyForecast {
    pub id: i64,
    pub name: String,
    pub monthly_avg_income: f64,
    pub monthly_avg_expense: f64,
    pub estimated_yield_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForecastSummary {
    pub timeline_months: i32,
    pub monthly_data: Vec<MonthlyForecastData>,
    pub properties: Vec<PropertyForecast>,
}
