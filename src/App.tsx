import { useState } from "react";
import "./App.css";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Properties } from "./pages/Properties";
import { Incomes } from "./pages/Incomes";
import { Expenses } from "./pages/Expenses";
import { Analytics } from "./pages/Analytics";

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
      case "expenses":
        return <Expenses />;
      case "analytics":
        return <Analytics />;
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

