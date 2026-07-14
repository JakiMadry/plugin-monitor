import { Box, Group, Select, Menu, UnstyledButton, Avatar, Text } from "@mantine/core";
import {
  IconLogout,
  IconUser,
  IconShieldCheck,
  IconReceipt,
  IconBug,
  IconSettings,
  IconChevronDown,
} from "@tabler/icons-react";
import { useShops, useMe, useLogout } from "../../api/hooks";
import { useAppStore } from "../../stores/useAppStore";
import { useNavigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { value: "hazard", label: "Domeny hazardowe", icon: IconShieldCheck },
  { value: "paywall", label: "Paywall Stats", icon: IconReceipt },
  { value: "errors", label: "Bledy wtyczek", icon: IconBug },
  { value: "settings", label: "Ustawienia", icon: IconSettings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: meData } = useMe();
  const { data: shops } = useShops();
  const logout = useLogout();
  const { selectedShopId, setSelectedShopId } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const user = meData?.user;
  const activeTab = location.pathname.replace("/", "") || "hazard";

  const shopOptions = [
    { value: "", label: "Wszystkie sklepy" },
    ...(shops?.map((s) => ({ value: s.id, label: `${s.name} (${s.domain})` })) || []),
  ];

  return (
    <Box style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Box
        component="nav"
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          backgroundColor: "#0f1d3f",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 200,
        }}
      >
        {/* Logo area */}
        <Box style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Group gap="xs">
            <IconShieldCheck size={28} color="#007ecc" />
            <Text
              size="lg"
              fw={700}
              style={{ color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
            >
              Plugin Monitor
            </Text>
          </Group>
        </Box>

        {/* Nav items */}
        <Box style={{ flex: 1, paddingTop: "0.75rem" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <UnstyledButton
                key={item.value}
                onClick={() => navigate(`/${item.value}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.875rem",
                  fontFamily: "'Montserrat', sans-serif",
                  color: isActive ? "#fff" : "#a4a6b3",
                  backgroundColor: isActive ? "#0e78bb" : "transparent",
                  borderLeft: `3px solid ${isActive ? "#007ecc" : "transparent"}`,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = "#f50084";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = "#a4a6b3";
                  }
                }}
              >
                <item.icon size={20} stroke={1.5} />
                <span>{item.label}</span>
              </UnstyledButton>
            );
          })}
        </Box>

        {/* Sidebar footer - user info */}
        <Box
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Group gap="xs">
            <Avatar size="sm" radius="xl" style={{ backgroundColor: "#0e78bb" }}>
              <IconUser size={14} color="#fff" />
            </Avatar>
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <Text size="xs" style={{ color: "#fff" }} truncate>
                {user?.displayName || user?.email}
              </Text>
              <Text size="xs" style={{ color: "#a4a6b3" }} truncate>
                {user?.role}
              </Text>
            </Box>
          </Group>
        </Box>
      </Box>

      {/* Main content area */}
      <Box style={{ flex: 1, marginLeft: SIDEBAR_WIDTH, display: "flex", flexDirection: "column" }}>
        {/* Top header bar */}
        <Box
          component="header"
          style={{
            height: 50,
            backgroundColor: "#fff",
            borderBottom: "1px solid #dadada",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <Box />

          <Group gap="md">
            <Select
              placeholder="Wybierz sklep"
              data={shopOptions}
              value={selectedShopId || ""}
              onChange={(v) => setSelectedShopId(v || null)}
              searchable
              clearable
              w={280}
              size="sm"
              styles={{
                input: {
                  borderColor: "#dadada",
                  fontSize: "0.875rem",
                },
              }}
            />

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" radius="xl" style={{ backgroundColor: "#007ecc" }}>
                      <IconUser size={14} color="#fff" />
                    </Avatar>
                    <Text size="sm" fw={500}>{user?.displayName || user?.email}</Text>
                    <IconChevronDown size={14} color="#a4a6b3" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Label>Rola: {user?.role}</Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={() => logout.mutate()}
                  color="red"
                >
                  Wyloguj
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Box>

        {/* Page content */}
        <Box
          style={{
            flex: 1,
            backgroundColor: "#f2f5fc",
            padding: "1.5rem",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
