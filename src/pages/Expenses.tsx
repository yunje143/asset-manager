import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import * as api from "../lib/api";
import { Expense, Property, Unit } from "../types";

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "Repair",
    property_id: 0,
    unit_id: null as number | null,
    note: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, propertiesData, unitsData] = await Promise.all([
        api.getExpenses(),
        api.getProperties(),
        api.getUnits(),
      ]);
      setExpenses(expensesData);
      setProperties(propertiesData);
      setUnits(unitsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, amount: digitsOnly }));
  };

  const getDisplayAmount = () => {
    if (!formData.amount) return "";
    return parseInt(formData.amount).toLocaleString("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getPropertyLabel = (property_id: number) => {
    const property = properties.find((p) => p.id === property_id);
    return property ? property.name : `Property #${property_id}`;
  };

  const getUnitLabel = (unit_id: number | null) => {
    if (!unit_id) return "-";
    const unit = units.find((u) => u.id === unit_id);
    return unit ? unit.room_number : `Unit #${unit_id}`;
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.amount || formData.property_id === 0) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      let savedExpense: Expense;

      if (editingExpenseId) {
        // Update existing expense
        savedExpense = await api.updateExpense(
          editingExpenseId,
          formData.date,
          parseInt(formData.amount),
          formData.category,
          formData.property_id,
          formData.unit_id,
          formData.note || undefined
        );
        setExpenses(
          expenses.map((e) => (e.id === editingExpenseId ? savedExpense : e))
        );
      } else {
        // Create new expense
        savedExpense = await api.createExpense(
          formData.date,
          parseInt(formData.amount),
          formData.category,
          formData.property_id,
          formData.unit_id,
          formData.note || undefined
        );
        setExpenses([savedExpense, ...expenses]);
      }

      handleCancelEdit();
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      date: expense.date,
      amount: expense.amount.toString(),
      category: expense.category,
      property_id: expense.property_id,
      unit_id: expense.unit_id,
      note: expense.note || "",
    });
    setShowForm(true);
    setError(null);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await api.deleteExpense(id);
      setExpenses(expenses.filter((e) => e.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    }
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      category: "Repair",
      property_id: 0,
      unit_id: null,
      note: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              handleCancelEdit();
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingExpenseId ? "Edit" : "Add"} Expense
          </h3>

          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ¥
                </label>
                <input
                  type="text"
                  value={getDisplayAmount()}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option>Repair</option>
                  <option>Maintenance</option>
                  <option>Tax</option>
                  <option>Insurance</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      property_id: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>Select Property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit (Optional)
                </label>
                <select
                  value={formData.unit_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unit_id: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.room_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Optional note..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {editingExpenseId ? "Update Expense" : "Add Expense"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  handleCancelEdit();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No expenses recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getPropertyLabel(expense.property_id)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getUnitLabel(expense.unit_id)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-red-600">
                      ¥
                      {expense.amount.toLocaleString("ja-JP", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.note || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2 flex">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="text-xs">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-xs">Delete</span>
                      </button>
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
