import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Tabs, Loader, Center } from "@mantine/core";
import { IconShieldCheck, IconReceipt, IconBug, IconSettings } from "@tabler/icons-react";
import { useMe } from "./api/hooks";
import { AppLayout } from "./components/Layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { HazardTab } from "./components/HazardTab/HazardTab";
import { PaywallTab } from "./components/PaywallTab/PaywallTab";
import { ErrorsTab } from "./components/ErrorsTab/ErrorsTab";
import { SettingsPage } from "./components/SettingsPage/SettingsPage";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabFromPath = location.pathname.replace("/", "") || "hazard";

  return (
    <AppLayout>
      <Tabs
        value={tabFromPath}
        onChange={(value) => navigate(`/${value}`)}
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="hazard" leftSection={<IconShieldCheck size={16} />}>
            Domeny hazardowe
          </Tabs.Tab>
          <Tabs.Tab value="paywall" leftSection={<IconReceipt size={16} />}>
            Paywall Stats
          </Tabs.Tab>
          <Tabs.Tab value="errors" leftSection={<IconBug size={16} />}>
            Bledy wtyczek
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Ustawienia
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="hazard"><HazardTab /></Tabs.Panel>
        <Tabs.Panel value="paywall"><PaywallTab /></Tabs.Panel>
        <Tabs.Panel value="errors"><ErrorsTab /></Tabs.Panel>
        <Tabs.Panel value="settings"><SettingsPage /></Tabs.Panel>
      </Tabs>
    </AppLayout>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
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
