import create from "zustand";
import {
  Property,
  Unit,
  Income,
  DashboardSummary,
} from "../types";

interface AssetStore {
  // Properties
  properties: Property[];
  setProperties: (properties: Property[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (property: Property) => void;
  removeProperty: (id: number) => void;

  // Units
  units: Unit[];
  setUnits: (units: Unit[]) => void;
  addUnit: (unit: Unit) => void;

  // Incomes
  incomes: Income[];
  setIncomes: (incomes: Income[]) => void;
  addIncome: (income: Income) => void;

  // Dashboard
  dashboard: DashboardSummary | null;
  setDashboard: (dashboard: DashboardSummary) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAssetStore = create<AssetStore>((set) => ({
  // Properties
  properties: [],
  setProperties: (properties) => set({ properties }),
  addProperty: (property) =>
    set((state) => ({ properties: [...state.properties, property] })),
  updateProperty: (updated) =>
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === updated.id ? updated : p
      ),
    })),
  removeProperty: (id) =>
    set((state) => ({
      properties: state.properties.filter((p) => p.id !== id),
    })),

  // Units
  units: [],
  setUnits: (units) => set({ units }),
  addUnit: (unit) =>
    set((state) => ({ units: [...state.units, unit] })),

  // Incomes
  incomes: [],
  setIncomes: (incomes) => set({ incomes }),
  addIncome: (income) =>
    set((state) => ({ incomes: [...state.incomes, income] })),

  // Dashboard
  dashboard: null,
  setDashboard: (dashboard) => set({ dashboard }),

  // Loading
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Error
  error: null,
  setError: (error) => set({ error }),
}));
