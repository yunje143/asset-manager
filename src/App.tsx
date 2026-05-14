import { useState } from "react";
import "./App.css";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Properties } from "./pages/Properties";
import { Incomes } from "./pages/Incomes";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  function renderPage() {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "properties":
        return <Properties />;
      case "incomes":
        return <Incomes />;
      case "analytics":
        return (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Analytics coming soon</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;

