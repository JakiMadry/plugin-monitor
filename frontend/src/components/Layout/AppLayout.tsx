import { AppShell, Group, Title, Select, Menu, UnstyledButton, Avatar, Text } from "@mantine/core";
import { IconLogout, IconUser, IconShield } from "@tabler/icons-react";
import { useShops, useMe, useLogout } from "../../api/hooks";
import { useAppStore } from "../../stores/useAppStore";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: meData } = useMe();
  const { data: shops } = useShops();
  const logout = useLogout();
  const { selectedShopId, setSelectedShopId } = useAppStore();

  const user = meData?.user;

  const shopOptions = [
    { value: "", label: "Wszystkie sklepy" },
    ...(shops?.map((s) => ({ value: s.id, label: `${s.name} (${s.domain})` })) || []),
  ];

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <IconShield size={28} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Plugin Monitor</Title>
          </Group>

          <Group>
            <Select
              placeholder="Wybierz sklep"
              data={shopOptions}
              value={selectedShopId || ""}
              onChange={(v) => setSelectedShopId(v || null)}
              searchable
              clearable
              w={300}
            />

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" radius="xl" color="blue">
                      <IconUser size={16} />
                    </Avatar>
                    <Text size="sm">{user?.displayName || user?.email}</Text>
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
                >
                  Wyloguj
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
