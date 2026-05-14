import React, { useEffect, useState } from "react";
import { getIncomes, getUnits, createIncome } from "../lib/api";
import { Income, Unit } from "../types";
import { AlertCircle, Plus, DollarSign } from "lucide-react";

export function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "Rent",
    unit_id: "",
    note: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [incomesData, unitsData] = await Promise.all([
        getIncomes(),
        getUnits(),
      ]);
      setIncomes(incomesData);
      setUnits(unitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      const newIncome = await createIncome(
        formData.date,
        parseFloat(formData.amount),
        formData.category,
        formData.unit_id ? parseInt(formData.unit_id) : null,
        formData.note || undefined
      );
      setIncomes([newIncome, ...incomes]);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        category: "Rent",
        unit_id: "",
        note: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create income");
      console.error("Create income error:", err);
    }
  }

  function getUnitLabel(unitId: number | null): string {
    if (!unitId) return "Unassigned";
    const unit = units.find((u) => u.id === unitId);
    return unit ? `${unit.room_number}` : `Unit #${unitId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading incomes...</div>
      </div>
    );
  }

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const pendingIncome = incomes
    .filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + i.amount, 0);
  const completedIncome = incomes
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Incomes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Income
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Income"
          value={`¥${totalIncome.toLocaleString()}`}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Pending"
          value={`¥${pendingIncome.toLocaleString()}`}
          color="bg-yellow-50 text-yellow-600"
        />
        <SummaryCard
          title="Completed"
          value={`¥${completedIncome.toLocaleString()}`}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Add Income Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add New Income
          </h3>
          <form onSubmit={handleAddIncome} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (¥)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Rent, Deposit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit (Optional)
                </label>
                <select
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Unit --</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.room_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Add any notes..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Income
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Incomes Table */}
      {incomes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No incomes recorded</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your first income entry to get started
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{income.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {income.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getUnitLabel(income.unit_id)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-emerald-600">
                      ¥{income.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        income.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {income.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {income.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  color: string;
}

function SummaryCard({ title, value, color }: SummaryCardProps) {
  return (
    <div className={`rounded-lg shadow p-6 ${color}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
