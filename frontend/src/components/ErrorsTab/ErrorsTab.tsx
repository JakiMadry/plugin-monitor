import { useState } from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  SegmentedControl,
  SimpleGrid,
  Pagination,
  Collapse,
  Code,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle, IconBug, IconInfoCircle, IconFlame, IconCheck } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import { usePluginEvents, useErrorStats, useMarkEventRead } from "../../api/hooks";
import { useAppStore } from "../../stores/useAppStore";
import dayjs from "dayjs";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "red",
  error: "orange",
  warning: "yellow",
  info: "blue",
};

const SEVERITY_ICONS: Record<string, typeof IconBug> = {
  critical: IconFlame,
  error: IconBug,
  warning: IconAlertTriangle,
  info: IconInfoCircle,
};

export function ErrorsTab() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const selectedShopId = useAppStore((s) => s.selectedShopId);

  const { data: stats } = useErrorStats(selectedShopId || undefined);
  const { data: events, isLoading } = usePluginEvents({
    page,
    shopId: selectedShopId || undefined,
    severity: severity || undefined,
  });
  const markRead = useMarkEventRead();

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const statsMap = Object.fromEntries(
    stats?.map((s) => [s.severity, s]) || []
  );

  return (
    <Stack>
      {/* Severity summary cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {["critical", "error", "warning", "info"].map((sev) => {
          const Icon = SEVERITY_ICONS[sev];
          const stat = statsMap[sev];
          return (
            <Card
              key={sev}
              withBorder
              style={{ cursor: "pointer", borderColor: severity === sev ? `var(--mantine-color-${SEVERITY_COLORS[sev]}-5)` : undefined }}
              onClick={() => { setSeverity(severity === sev ? "" : sev); setPage(1); }}
            >
              <Group>
                <Icon size={24} color={`var(--mantine-color-${SEVERITY_COLORS[sev]}-6)`} />
                <div>
                  <Text size="xs" c="dimmed" tt="capitalize">{sev}</Text>
                  <Group gap="xs">
                    <Text fw={700} size="xl">{stat?.count || 0}</Text>
                    {stat?.unread > 0 && (
                      <Badge color={SEVERITY_COLORS[sev]} size="sm">{stat.unread} nowych</Badge>
                    )}
                  </Group>
                </div>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Filter */}
      <SegmentedControl
        value={severity}
        onChange={(v) => { setSeverity(v); setPage(1); }}
        data={[
          { value: "", label: "Wszystkie" },
          { value: "critical", label: "Critical" },
          { value: "error", label: "Error" },
          { value: "warning", label: "Warning" },
          { value: "info", label: "Info" },
        ]}
      />

      {/* Events table */}
      <DataTable
        records={events?.data || []}
        fetching={isLoading}
        columns={[
          {
            accessor: "severity",
            title: "Poziom",
            width: 100,
            render: ({ severity }) => (
              <Badge color={SEVERITY_COLORS[severity]} size="sm">{severity}</Badge>
            ),
          },
          { accessor: "shopName", title: "Sklep", width: 150 },
          { accessor: "source", title: "Zrodlo", width: 150 },
          {
            accessor: "message",
            title: "Wiadomosc",
            render: ({ message }) => (
              <Text size="sm" lineClamp={1}>{message}</Text>
            ),
          },
          {
            accessor: "occurredAt",
            title: "Data",
            width: 150,
            render: ({ occurredAt }) => dayjs(occurredAt).format("DD.MM HH:mm:ss"),
          },
          {
            accessor: "actions",
            title: "",
            width: 60,
            render: (record) => (
              <Group gap="xs">
                {!record.isRead && (
                  <Tooltip label="Oznacz jako przeczytane">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="green"
                      onClick={(e) => { e.stopPropagation(); markRead.mutate(record.id); }}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ),
          },
        ]}
        highlightOnHover
        noRecordsText="Brak zdarzen"
        minHeight={200}
        rowStyle={({ isRead }) => (!isRead ? { fontWeight: 500 } : undefined)}
        onRowClick={({ record }) => toggleExpanded(record.id)}
        rowExpansion={{
          content: ({ record }) => (
            <Stack p="md" gap="xs">
              <Text size="sm"><strong>Pelen komunikat:</strong> {record.message}</Text>
              {record.source && <Text size="sm"><strong>Zrodlo:</strong> {record.source}</Text>}
              {record.metadata && (
                <div>
                  <Text size="sm" fw={500}>Metadata:</Text>
                  <Code block>{JSON.stringify(record.metadata, null, 2)}</Code>
                </div>
              )}
              {record.stackTrace && (
                <div>
                  <Text size="sm" fw={500}>Stack trace:</Text>
                  <Code block style={{ maxHeight: 300, overflow: "auto" }}>
                    {record.stackTrace}
                  </Code>
                </div>
              )}
            </Stack>
          ),
        }}
      />

      {events?.pagination && (
        <Group justify="center">
          <Pagination
            total={events.pagination.totalPages}
            value={page}
            onChange={setPage}
          />
        </Group>
      )}
    </Stack>
  );
}
