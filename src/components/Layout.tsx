import React from "react";
import {
  LayoutGrid,
  Home,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({
  children,
  currentPage,
  onNavigate,
}: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Asset Manager
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={<LayoutGrid className="w-5 h-5" />}
            label="Dashboard"
            active={currentPage === "dashboard"}
            onClick={() => onNavigate("dashboard")}
          />
          <NavItem
            icon={<Home className="w-5 h-5" />}
            label="Properties"
            active={currentPage === "properties"}
            onClick={() => onNavigate("properties")}
          />
          <NavItem
            icon={<DollarSign className="w-5 h-5" />}
            label="Incomes"
            active={currentPage === "incomes"}
            onClick={() => onNavigate("incomes")}
          />
          <NavItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Analytics"
            active={currentPage === "analytics"}
            onClick={() => onNavigate("analytics")}
          />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">v0.1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
