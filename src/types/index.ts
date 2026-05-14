// Property (物件)
export interface Property {
  id: number;
  name: string;
  address: string;
  type: "Mansion" | "Tenant" | "Stay";
  purchase_price: number;
  purchase_date: string;
  useful_life: number;
  created_at: string;
  updated_at: string;
}

// Unit (部屋)
export interface Unit {
  id: number;
  property_id: number;
  room_number: string;
  usage_type: "Lease" | "Stay" | "Tenant";
  target_rent: number;
  area_size: number;
  created_at: string;
  updated_at: string;
}

// Income (収入)
export interface Income {
  id: number;
  date: string;
  amount: number;
  category: string;
  unit_id: number | null;
  status: "pending" | "completed";
  source_type: "auto" | "manual";
  external_ref_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Expense (費用)
export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  property_id: number;
  unit_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Loan (ローン)
export interface Loan {
  id: number;
  property_id: number;
  principal: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  created_at: string;
  updated_at: string;
}

// Dashboard Summary
export interface PropertySummary {
  id: number;
  name: string;
  address: string;
  property_type: string;
  purchase_price: number;
  monthly_income: number;
  monthly_expense: number;
  net_yield_percent: number;
  units_count: number;
}

export interface DashboardSummary {
  total_properties: number;
  total_units: number;
  total_income_this_month: number;
  total_expense_this_month: number;
  total_asset_value: number;
  weighted_yield_percent: number;
  properties: PropertySummary[];
}
