import { useState } from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Button,
  TextInput,
  Title,
  SimpleGrid,
  Loader,
  Table,
  Pagination,
  Box,
} from "@mantine/core";
import { IconRefresh, IconSearch, IconAlertTriangle, IconWorld, IconClock } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import {
  useHazardStatus,
  useHazardDomains,
  useHazardAlerts,
  useHazardSyncLog,
  useHazardCheck,
} from "../../api/hooks";
import { useAppStore } from "../../stores/useAppStore";
import dayjs from "dayjs";

const cardStyle = {
  border: "1px solid #dadada",
  borderRadius: "0.375rem",
  backgroundColor: "#fff",
};

export function HazardTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const selectedShopId = useAppStore((s) => s.selectedShopId);

  const { data: status, isLoading: statusLoading } = useHazardStatus();
  const { data: domains, isLoading: domainsLoading } = useHazardDomains(page, search || undefined);
  const { data: alerts } = useHazardAlerts(selectedShopId || undefined);
  const { data: syncLog } = useHazardSyncLog();
  const checkNow = useHazardCheck();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  if (statusLoading) return <Loader color="#007ecc" />;

  return (
    <Stack>
      {/* Status cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Card style={{ ...cardStyle, borderTop: "3px solid #007ecc" }} p="md">
          <Group>
            <Box style={{ backgroundColor: "rgba(0,126,204,0.1)", borderRadius: "0.375rem", padding: 8 }}>
              <IconWorld size={24} color="#007ecc" />
            </Box>
            <div>
              <Text size="xs" c="dimmed" fw={500}>Domeny w rejestrze</Text>
              <Text fw={700} size="xl" style={{ color: "#171a1e" }}>{status?.totalDomains?.toLocaleString()}</Text>
            </div>
          </Group>
        </Card>
        <Card style={{ ...cardStyle, borderTop: "3px solid #fdb82b" }} p="md">
          <Group>
            <Box style={{ backgroundColor: "rgba(253,184,43,0.1)", borderRadius: "0.375rem", padding: 8 }}>
              <IconAlertTriangle size={24} color="#fdb82b" />
            </Box>
            <div>
              <Text size="xs" c="dimmed" fw={500}>Aktywne domeny</Text>
              <Text fw={700} size="xl" style={{ color: "#171a1e" }}>{status?.activeDomains?.toLocaleString()}</Text>
            </div>
          </Group>
        </Card>
        <Card style={{ ...cardStyle, borderTop: "3px solid #f50084" }} p="md">
          <Group>
            <Box style={{ backgroundColor: "rgba(245,0,132,0.1)", borderRadius: "0.375rem", padding: 8 }}>
              <IconAlertTriangle size={24} color="#f50084" />
            </Box>
            <div>
              <Text size="xs" c="dimmed" fw={500}>Alerty</Text>
              <Text fw={700} size="xl" style={{ color: status?.activeAlerts ? "#f50084" : "#171a1e" }}>
                {status?.activeAlerts || 0}
              </Text>
            </div>
          </Group>
        </Card>
        <Card style={{ ...cardStyle, borderTop: "3px solid #a4a6b3" }} p="md">
          <Group>
            <Box style={{ backgroundColor: "rgba(164,166,179,0.1)", borderRadius: "0.375rem", padding: 8 }}>
              <IconClock size={24} color="#a4a6b3" />
            </Box>
            <div>
              <Text size="xs" c="dimmed" fw={500}>Ostatni sync</Text>
              <Text fw={500} size="sm" style={{ color: "#171a1e" }}>
                {status?.lastSync ? dayjs(status.lastSync.finishedAt).format("DD.MM.YYYY HH:mm") : "Brak"}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Manual check button */}
      <Group>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={() => checkNow.mutate()}
          loading={checkNow.isPending}
          style={{ backgroundColor: "#007ecc", borderRadius: "0.375rem" }}
        >
          Sprawdz teraz
        </Button>
      </Group>

      {/* Alerts section */}
      {alerts && alerts.length > 0 && (
        <Card style={cardStyle} p="md">
          <Title order={5} mb="sm" style={{ color: "#f50084" }}>
            Alerty - dopasowane domeny sklepow
          </Title>
          <DataTable
            records={alerts}
            columns={[
              { accessor: "shopName", title: "Sklep" },
              { accessor: "shopDomain", title: "Domena sklepu" },
              { accessor: "matchedDomain", title: "Domena z rejestru" },
              {
                accessor: "status",
                title: "Status",
                render: ({ status }) => (
                  <Badge color={status === "active" ? "red" : status === "acknowledged" ? "orange" : "green"}>
                    {status}
                  </Badge>
                ),
              },
              {
                accessor: "createdAt",
                title: "Data",
                render: ({ createdAt }) => dayjs(createdAt).format("DD.MM.YYYY HH:mm"),
              },
            ]}
            highlightOnHover
            noRecordsText="Brak alertow"
          />
        </Card>
      )}

      {/* Domain search & browser */}
      <Card style={cardStyle} p="md">
        <Title order={5} mb="sm" style={{ color: "#171a1e" }}>Przegladarka rejestru domen hazardowych</Title>
        <Group mb="md">
          <TextInput
            placeholder="Szukaj domeny..."
            leftSection={<IconSearch size={16} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1 }}
            styles={{
              input: { borderColor: "#dadada", fontSize: "0.875rem" },
            }}
          />
          <Button
            onClick={handleSearch}
            variant="light"
            style={{ borderRadius: "0.375rem" }}
          >
            Szukaj
          </Button>
        </Group>

        <DataTable
          records={domains?.data || []}
          fetching={domainsLoading}
          columns={[
            { accessor: "lp", title: "Lp", width: 80 },
            { accessor: "domain", title: "Domena" },
            {
              accessor: "dateAdded",
              title: "Data wpisu",
              render: ({ dateAdded }) => dayjs(dateAdded).format("DD.MM.YYYY"),
            },
            {
              accessor: "dateRemoved",
              title: "Wykreslona",
              render: ({ dateRemoved }) =>
                dateRemoved ? dayjs(dateRemoved).format("DD.MM.YYYY") : (
                  <Badge color="red" size="sm">Aktywna</Badge>
                ),
            },
          ]}
          highlightOnHover
          noRecordsText="Brak domen"
          minHeight={200}
        />
        {domains?.pagination && (
          <Group justify="center" mt="md">
            <Pagination
              total={domains.pagination.totalPages}
              value={page}
              onChange={setPage}
            />
          </Group>
        )}
      </Card>

      {/* Sync log */}
      {syncLog && syncLog.length > 0 && (
        <Card style={cardStyle} p="md">
          <Title order={5} mb="sm" style={{ color: "#171a1e" }}>Historia synchronizacji</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: "#f7f8fc" }}>
                <Table.Th>Typ</Table.Th>
                <Table.Th>Data</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Domeny</Table.Th>
                <Table.Th>Dodane</Table.Th>
                <Table.Th>Usuniete</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {syncLog.slice(0, 10).map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Badge variant="light">{log.syncType.toUpperCase()}</Badge>
                  </Table.Td>
                  <Table.Td>{dayjs(log.startedAt).format("DD.MM.YYYY HH:mm")}</Table.Td>
                  <Table.Td>
                    <Badge color={log.status === "completed" ? "green" : log.status === "failed" ? "red" : "yellow"}>
                      {log.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{log.domainsTotal?.toLocaleString() ?? "-"}</Table.Td>
                  <Table.Td>{log.domainsAdded}</Table.Td>
                  <Table.Td>{log.domainsRemoved}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
