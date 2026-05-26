import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getForecastSummary } from "../lib/api";
import { ForecastSummary } from "../types";

export function Analytics() {
  const [forecastData, setForecastData] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<12 | 36 | 120>(12);

  useEffect(() => {
    loadForecastData();
  }, [timeline]);

  const loadForecastData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForecastSummary(timeline);
      setForecastData(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
      console.error("Forecast load error details:", err);
      console.error("Error type:", typeof err);
      console.error("Error toString:", String(err));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `¥${(value / 1000000).toFixed(1)}M`;
  };

  const chartData = forecastData?.monthly_data.map((item) => ({
    month: new Date(item.month).toLocaleDateString("ja-JP", { year: "numeric", month: "short" }),
    income: item.income,
    expense: item.expense,
    net: item.net_cash_flow,
  })) || [];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Loading forecast data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Analytics & Forecast</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeline(12)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeline === 12
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            12 Months
          </button>
          <button
            onClick={() => setTimeline(36)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeline === 36
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            3 Years
          </button>
          <button
            onClick={() => setTimeline(120)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeline === 120
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            10 Years
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Monthly Forecast Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {timeline === 12 && "Monthly Cash Flow (12 Months)"}
          {timeline === 36 && "Monthly Cash Flow (3 Years)"}
          {timeline === 120 && "Monthly Cash Flow (10 Years)"}
        </h3>
        
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis 
              stroke="#6b7280"
              tickFormatter={formatCurrency}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              formatter={(value: number) => `¥${value.toLocaleString("ja-JP")}`}
              labelStyle={{ color: "#000" }}
              contentStyle={{ 
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px"
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Income"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Expense"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Net Cash Flow"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Property Forecasts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Property Forecast Summary</h3>
        </div>
        
        {forecastData?.properties && forecastData.properties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Property
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Monthly Avg Income
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Monthly Avg Expense
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Monthly Net
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Estimated Yield
                  </th>
                </tr>
              </thead>
              <tbody>
                {forecastData.properties.map((prop) => (
                  <tr key={prop.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {prop.name}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-600 font-medium">
                      ¥
                      {prop.monthly_avg_income.toLocaleString("ja-JP", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                      ¥
                      {prop.monthly_avg_expense.toLocaleString("ja-JP", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <span className={prop.monthly_avg_income - prop.monthly_avg_expense >= 0 ? "text-blue-600" : "text-red-600"}>
                        ¥
                        {(prop.monthly_avg_income - prop.monthly_avg_expense).toLocaleString("ja-JP", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <span className={prop.estimated_yield_percent >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {prop.estimated_yield_percent.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>No properties with forecast data available.</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {forecastData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Monthly Income</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              ¥
              {(forecastData.monthly_data[0]?.income || 0).toLocaleString("ja-JP", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Monthly Expense</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ¥
              {(forecastData.monthly_data[0]?.expense || 0).toLocaleString("ja-JP", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Monthly Net Cash Flow</p>
            <p className={`text-2xl font-bold mt-2 ${(forecastData.monthly_data[0]?.net_cash_flow || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
              ¥
              {(forecastData.monthly_data[0]?.net_cash_flow || 0).toLocaleString("ja-JP", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Timeline</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {timeline === 12 && "12M"}
              {timeline === 36 && "3Y"}
              {timeline === 120 && "10Y"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
