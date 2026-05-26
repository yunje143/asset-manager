import { invoke } from "@tauri-apps/api/core";
import {
  Property,
  Unit,
  Income,
  Expense,
  DashboardSummary,
  ForecastSummary,
} from "../types";

// ===================== Environment Detection =====================

/**
 * Check if running in Tauri environment (desktop app)
 */
function isTauriEnvironment(): boolean {
  return (window as any).__TAURI_INTERNALS__ !== undefined;
}

/**
 * Safely invoke Tauri command with environment check
 */
async function safeInvoke<T>(command: string, args: any = {}): Promise<T> {
  if (!isTauriEnvironment()) {
    throw new Error(
      "Tauri backend is not available. This feature only works in the Tauri desktop app, not in the browser."
    );
  }
  return invoke(command, args);
}

// ===================== Properties =====================

export async function getProperties(): Promise<Property[]> {
  return safeInvoke("get_properties");
}

export async function getProperty(id: number): Promise<Property | null> {
  return safeInvoke("get_property", { id });
}

export async function createProperty(
  name: string,
  address: string,
  type: string,
  purchase_price: number,
  purchase_date: string,
  useful_life: number
): Promise<Property> {
  return safeInvoke("create_property", {
    req: {
      name,
      address,
      type,
      purchase_price,
      purchase_date,
      useful_life,
    },
  });
}

export async function updateProperty(
  id: number,
  name: string,
  address: string,
  type: string,
  purchase_price: number,
  purchase_date: string,
  useful_life: number
): Promise<Property> {
  return safeInvoke("update_property", {
    id,
    req: {
      name,
      address,
      type,
      purchase_price,
      purchase_date,
      useful_life,
    },
  });
}

export async function deleteProperty(id: number): Promise<void> {
  return safeInvoke("delete_property", { id });
}

// ===================== Units =====================

export async function getUnits(property_id?: number): Promise<Unit[]> {
  return safeInvoke("get_units", { property_id });
}

export async function createUnit(
  property_id: number,
  room_number: string,
  usage_type: string,
  target_rent: number,
  area_size: number
): Promise<Unit> {
  return safeInvoke("create_unit", {
    req: {
      property_id,
      room_number,
      usage_type,
      target_rent,
      area_size,
    },
  });
}

// ===================== Incomes =====================

export async function getIncomes(unit_id?: number): Promise<Income[]> {
  return safeInvoke("get_incomes", { unit_id });
}

export async function createIncome(
  date: string,
  amount: number,
  category: string,
  unit_id: number | null,
  note?: string,
  status?: string
): Promise<Income> {
  return safeInvoke("create_income", {
    req: {
      date,
      amount,
      category,
      unit_id,
      note,
      status,
    },
  });
}

export async function updateIncome(
  id: number,
  date: string,
  amount: number,
  category: string,
  unit_id: number | null,
  note?: string,
  status?: string
): Promise<Income> {
  return safeInvoke("update_income", {
    id,
    req: {
      date,
      amount,
      category,
      unit_id,
      note,
      status,
    },
  });
}

// ===================== Expenses =====================

export async function getExpenses(property_id?: number): Promise<Expense[]> {
  return safeInvoke("get_expenses", { property_id });
}

export async function createExpense(
  date: string,
  amount: number,
  category: string,
  property_id: number,
  unit_id?: number | null,
  note?: string
): Promise<Expense> {
  return safeInvoke("create_expense", {
    req: {
      date,
      amount,
      category,
      property_id,
      unit_id,
      note,
    },
  });
}

export async function updateExpense(
  id: number,
  date: string,
  amount: number,
  category: string,
  property_id: number,
  unit_id?: number | null,
  note?: string
): Promise<Expense> {
  return safeInvoke("update_expense", {
    id,
    req: {
      date,
      amount,
      category,
      property_id,
      unit_id,
      note,
    },
  });
}

export async function deleteExpense(id: number): Promise<void> {
  return safeInvoke("delete_expense", { id });
}

// ===================== Analytics =====================

export async function getForecastSummary(timelineMonths: number): Promise<ForecastSummary> {
  return safeInvoke("get_forecast_summary", { timelineMonths });
}

// ===================== Dashboard =====================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return safeInvoke("get_dashboard_summary");
}
