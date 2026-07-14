import { useState } from "react";
import {
  Stack,
  Card,
  Title,
  TextInput,
  Select,
  Button,
  Group,
  Badge,
  Text,
  Modal,
  ActionIcon,
  Tooltip,
  Switch,
  PasswordInput,
  Tabs,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconUsers,
  IconBell,
  IconBuildingStore,
} from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import {
  useShops,
  useUpdateShop,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useNotificationPrefs,
  useSetNotificationPref,
  useDeleteNotificationPref,
  useMe,
} from "../../api/hooks";
import dayjs from "dayjs";

const cardStyle = {
  border: "1px solid #dadada",
  borderRadius: "0.375rem",
  backgroundColor: "#fff",
};

const PLATFORMS = [
  { value: "woocommerce", label: "WooCommerce" },
  { value: "magento", label: "Magento" },
  { value: "sylius", label: "Sylius" },
  { value: "prestashop", label: "PrestaShop" },
];

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
];

const SECTIONS = [
  { value: "all", label: "Wszystkie" },
  { value: "hazard", label: "Hazard" },
  { value: "paywall", label: "Paywall" },
  { value: "errors", label: "Bledy" },
];

export function SettingsPage() {
  const { data: me } = useMe();
  const isAdmin = me?.user?.role === "admin";

  return (
    <Tabs defaultValue="shops">
      <Tabs.List
        mb="md"
        styles={{
          list: {
            borderBottom: "2px solid #dadada",
          },
        }}
      >
        <Tabs.Tab value="shops" leftSection={<IconBuildingStore size={16} />}>
          Sklepy
        </Tabs.Tab>
        {isAdmin && (
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Uzytkownicy
          </Tabs.Tab>
        )}
        <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
          Powiadomienia
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="shops"><ShopsSection /></Tabs.Panel>
      {isAdmin && <Tabs.Panel value="users"><UsersSection /></Tabs.Panel>}
      <Tabs.Panel value="notifications"><NotificationsSection /></Tabs.Panel>
    </Tabs>
  );
}

// --- Shops Section ---

function ShopsSection() {
  const { data: shops, isLoading } = useShops();
  const updateShop = useUpdateShop();

  return (
    <Stack>
      <Card style={cardStyle} p="md">
        <Group justify="space-between" mb="md">
          <Title order={5} style={{ color: "#171a1e" }}>Sklepy</Title>
          <Text size="sm" c="dimmed">Sklepy rejestruja sie automatycznie przy pierwszym kontakcie z wtyczki.</Text>
        </Group>

        <DataTable
          records={shops || []}
          fetching={isLoading}
          columns={[
            { accessor: "name", title: "Nazwa / Domena" },
            { accessor: "domain", title: "Domena" },
            {
              accessor: "platform",
              title: "Platforma",
              render: ({ platform }) => <Badge variant="light">{platform}</Badge>,
            },
            {
              accessor: "isActive",
              title: "Aktywny",
              render: (record) => (
                <Switch
                  checked={record.isActive}
                  onChange={(e) =>
                    updateShop.mutate({ id: record.id, isActive: e.currentTarget.checked })
                  }
                  size="sm"
                />
              ),
            },
            {
              accessor: "lastSeenAt",
              title: "Ostatni kontakt",
              render: ({ lastSeenAt }) =>
                lastSeenAt ? dayjs(lastSeenAt).format("DD.MM.YYYY HH:mm") : (
                  <Text size="sm" c="dimmed">Nigdy</Text>
                ),
            },
          ]}
          highlightOnHover
          noRecordsText="Brak sklepow -- pojawia sie po pierwszym kontakcie z wtyczki"
        />
      </Card>
    </Stack>
  );
}

// --- Users Section ---

function UsersSection() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { data: me } = useMe();

  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", displayName: "", role: "viewer" });

  const handleCreate = () => {
    createUser.mutate(newUser, {
      onSuccess: () => {
        setModalOpen(false);
        setNewUser({ email: "", password: "", displayName: "", role: "viewer" });
      },
    });
  };

  return (
    <Stack>
      <Card style={cardStyle} p="md">
        <Group justify="space-between" mb="md">
          <Title order={5} style={{ color: "#171a1e" }}>Uzytkownicy</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setModalOpen(true)}
            size="sm"
            style={{ backgroundColor: "#007ecc", borderRadius: "0.375rem" }}
          >
            Dodaj uzytkownika
          </Button>
        </Group>

        <DataTable
          records={users || []}
          fetching={isLoading}
          columns={[
            { accessor: "email", title: "Email" },
            {
              accessor: "displayName",
              title: "Nazwa",
              render: ({ displayName }) => displayName || <Text size="sm" c="dimmed">--</Text>,
            },
            {
              accessor: "role",
              title: "Rola",
              render: (record) => (
                <Select
                  data={ROLES}
                  value={record.role}
                  onChange={(v) => {
                    if (v && v !== record.role) {
                      updateUser.mutate({ id: record.id, role: v });
                    }
                  }}
                  size="xs"
                  w={120}
                  disabled={record.id === me?.user?.id}
                  styles={{
                    input: { borderColor: "#dadada" },
                  }}
                />
              ),
            },
            {
              accessor: "createdAt",
              title: "Utworzony",
              render: ({ createdAt }) => dayjs(createdAt).format("DD.MM.YYYY"),
            },
            {
              accessor: "actions",
              title: "",
              render: (record) => (
                <Tooltip label="Usun uzytkownika">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => deleteUser.mutate(record.id)}
                    disabled={record.id === me?.user?.id}
                    loading={deleteUser.isPending}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              ),
            },
          ]}
          highlightOnHover
          noRecordsText="Brak uzytkownikow"
        />
      </Card>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Dodaj uzytkownika">
        <Stack>
          <TextInput
            label="Email"
            placeholder="user@example.com"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.currentTarget.value })}
            required
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <PasswordInput
            label="Haslo"
            placeholder="Min. 6 znakow"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.currentTarget.value })}
            required
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <TextInput
            label="Nazwa wyswietlana"
            placeholder="Jan Kowalski"
            value={newUser.displayName}
            onChange={(e) => setNewUser({ ...newUser, displayName: e.currentTarget.value })}
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <Select
            label="Rola"
            data={ROLES}
            value={newUser.role}
            onChange={(v) => setNewUser({ ...newUser, role: v || "viewer" })}
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <Button
            onClick={handleCreate}
            loading={createUser.isPending}
            style={{ backgroundColor: "#007ecc", borderRadius: "0.375rem" }}
          >
            Utworz
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

// --- Notifications Section ---

function NotificationsSection() {
  const { data: prefs, isLoading } = useNotificationPrefs();
  const { data: shops } = useShops();
  const setPref = useSetNotificationPref();
  const deletePref = useDeleteNotificationPref();

  const [addOpen, setAddOpen] = useState(false);
  const [newPref, setNewPref] = useState({ section: "all", shopId: "", notifyEmail: true });

  const shopOptions = [
    { value: "", label: "Wszystkie sklepy" },
    ...(shops || []).map((s) => ({ value: s.id, label: `${s.name} (${s.domain})` })),
  ];

  const handleAdd = () => {
    setPref.mutate(
      {
        section: newPref.section,
        shopId: newPref.shopId || undefined,
        notifyEmail: newPref.notifyEmail,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setNewPref({ section: "all", shopId: "", notifyEmail: true });
        },
      }
    );
  };

  const getSectionLabel = (section: string) =>
    SECTIONS.find((s) => s.value === section)?.label || section;

  const getShopLabel = (shopId: string | null) => {
    if (!shopId) return "Wszystkie";
    const shop = shops?.find((s) => s.id === shopId);
    return shop ? shop.name : shopId;
  };

  return (
    <Stack>
      <Card style={cardStyle} p="md">
        <Group justify="space-between" mb="md">
          <Title order={5} style={{ color: "#171a1e" }}>Powiadomienia email</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddOpen(true)}
            size="sm"
            style={{ backgroundColor: "#007ecc", borderRadius: "0.375rem" }}
          >
            Dodaj regule
          </Button>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Skonfiguruj powiadomienia email dla wybranych sekcji i sklepow.
        </Text>

        <DataTable
          records={prefs || []}
          fetching={isLoading}
          columns={[
            {
              accessor: "section",
              title: "Sekcja",
              render: ({ section }) => (
                <Badge variant="light">{getSectionLabel(section)}</Badge>
              ),
            },
            {
              accessor: "shopId",
              title: "Sklep",
              render: ({ shopId }) => getShopLabel(shopId),
            },
            {
              accessor: "notifyEmail",
              title: "Email",
              render: (record) => (
                <Switch
                  checked={record.notifyEmail}
                  onChange={(e) =>
                    setPref.mutate({
                      section: record.section,
                      shopId: record.shopId || undefined,
                      notifyEmail: e.currentTarget.checked,
                    })
                  }
                  size="sm"
                />
              ),
            },
            {
              accessor: "actions",
              title: "",
              render: (record) => (
                <Tooltip label="Usun regule">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => deletePref.mutate(record.id)}
                    loading={deletePref.isPending}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              ),
            },
          ]}
          highlightOnHover
          noRecordsText="Brak regul powiadomien"
        />
      </Card>

      <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Dodaj regule powiadomien">
        <Stack>
          <Select
            label="Sekcja"
            data={SECTIONS}
            value={newPref.section}
            onChange={(v) => setNewPref({ ...newPref, section: v || "all" })}
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <Select
            label="Sklep"
            data={shopOptions}
            value={newPref.shopId}
            onChange={(v) => setNewPref({ ...newPref, shopId: v || "" })}
            searchable
            clearable
            styles={{ input: { borderColor: "#dadada" } }}
          />
          <Switch
            label="Powiadomienia email"
            checked={newPref.notifyEmail}
            onChange={(e) => setNewPref({ ...newPref, notifyEmail: e.currentTarget.checked })}
          />
          <Button
            onClick={handleAdd}
            loading={setPref.isPending}
            style={{ backgroundColor: "#007ecc", borderRadius: "0.375rem" }}
          >
            Dodaj
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
