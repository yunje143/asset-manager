import { invoke } from "@tauri-apps/api/core";
import {
  Property,
  Unit,
  Income,
  DashboardSummary,
} from "../types";

// ===================== Properties =====================

export async function getProperties(): Promise<Property[]> {
  return invoke("get_properties");
}

export async function getProperty(id: number): Promise<Property | null> {
  return invoke("get_property", { id });
}

export async function createProperty(
  name: string,
  address: string,
  type: string,
  purchase_price: number,
  purchase_date: string,
  useful_life: number
): Promise<Property> {
  return invoke("create_property", {
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
  return invoke("update_property", {
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
  return invoke("delete_property", { id });
}

// ===================== Units =====================

export async function getUnits(property_id?: number): Promise<Unit[]> {
  return invoke("get_units", { property_id });
}

export async function createUnit(
  property_id: number,
  room_number: string,
  usage_type: string,
  target_rent: number,
  area_size: number
): Promise<Unit> {
  return invoke("create_unit", {
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
  return invoke("get_incomes", { unit_id });
}

export async function createIncome(
  date: string,
  amount: number,
  category: string,
  unit_id: number | null,
  note?: string
): Promise<Income> {
  return invoke("create_income", {
    req: {
      date,
      amount,
      category,
      unit_id,
      note,
    },
  });
}

// ===================== Dashboard =====================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return invoke("get_dashboard_summary");
}
