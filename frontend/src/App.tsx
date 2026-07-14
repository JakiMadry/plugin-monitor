import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader, Center } from "@mantine/core";
import { useMe } from "./api/hooks";
import { AppLayout } from "./components/Layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { HazardTab } from "./components/HazardTab/HazardTab";
import { PaywallTab } from "./components/PaywallTab/PaywallTab";
import { ErrorsTab } from "./components/ErrorsTab/ErrorsTab";
import { SettingsPage } from "./components/SettingsPage/SettingsPage";

function Dashboard() {
  const location = useLocation();
  const path = location.pathname.replace("/", "") || "hazard";

  let content;
  switch (path) {
    case "hazard":
      content = <HazardTab />;
      break;
    case "paywall":
      content = <PaywallTab />;
      break;
    case "errors":
      content = <ErrorsTab />;
      break;
    case "settings":
      content = <SettingsPage />;
      break;
    default:
      content = <HazardTab />;
  }

  return <AppLayout>{content}</AppLayout>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" color="#007ecc" />
      </Center>
    );
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
