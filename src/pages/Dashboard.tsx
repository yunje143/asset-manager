import React, { useEffect, useState } from "react";
import { getDashboardSummary } from "../lib/api";
import { DashboardSummary } from "../types";
import { AlertCircle, TrendingUp, DollarSign, Home } from "lucide-react";

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center text-gray-500 py-12">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Properties"
          value={summary.total_properties}
          icon={<Home className="w-8 h-8 text-blue-600" />}
        />
        <SummaryCard
          title="Total Units"
          value={summary.total_units}
          icon={<Home className="w-8 h-8 text-green-600" />}
        />
        <SummaryCard
          title="Monthly Income"
          value={`¥${summary.total_income_this_month.toLocaleString('ja-JP', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={<DollarSign className="w-8 h-8 text-emerald-600" />}
        />
        <SummaryCard
          title="Weighted Yield"
          value={`${summary.weighted_yield_percent.toFixed(2)}%`}
          icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Overview
          </h3>
          <div className="space-y-4">
            <MetricRow
              label="Total Income"
              value={`¥${summary.total_income_this_month.toLocaleString('ja-JP', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
              color="text-emerald-600"
            />
            <MetricRow
              label="Total Expenses"
              value={`¥${summary.total_expense_this_month.toLocaleString('ja-JP', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
              color="text-red-600"
            />
            <div className="border-t pt-4">
              <MetricRow
                label="Net Cash Flow"
                value={`¥${(
                  summary.total_income_this_month -
                  summary.total_expense_this_month
                ).toLocaleString('ja-JP', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                color="text-blue-600"
                bold
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Portfolio Summary
          </h3>
          <div className="space-y-4">
            <MetricRow
              label="Total Asset Value"
              value={`¥${summary.total_asset_value.toLocaleString('ja-JP', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
              color="text-blue-600"
            />
            <MetricRow
              label="Average Yield"
              value={`${(
                summary.properties.reduce((sum, p) => sum + p.net_yield_percent, 0) /
                Math.max(summary.properties.length, 1)
              ).toFixed(2)}%`}
              color="text-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Properties Table */}
      {summary.properties.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Monthly Income
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Yield %
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.properties.map((prop) => (
                  <tr key={prop.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{prop.name}</p>
                        <p className="text-sm text-gray-500">{prop.address}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {prop.property_type}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ¥{prop.purchase_price.toLocaleString('ja-JP', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-600 font-medium">
                      ¥{prop.monthly_income.toLocaleString('ja-JP', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-medium ${
                        prop.net_yield_percent >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}>
                        {prop.net_yield_percent.toFixed(2)}%
                      </span>
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
  value: string | number;
  icon: React.ReactNode;
}

function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}

function MetricRow({ label, value, color, bold = false }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-gray-700">{label}</p>
      <p className={`${color} font-${bold ? "bold" : "semibold"}`}>{value}</p>
    </div>
  );
}
