import { useState } from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  SimpleGrid,
  Pagination,
  Code,
  Badge,
  Select,
} from "@mantine/core";
import { IconCreditCard, IconArrowBack, IconCash, IconReceipt } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePaywallEvents, usePaywallStats } from "../../api/hooks";
import { useAppStore } from "../../stores/useAppStore";
import dayjs from "dayjs";

const EVENT_ICONS: Record<string, typeof IconCreditCard> = {
  payment_completed: IconCash,
  payment_initiated: IconCreditCard,
  payment_failed: IconReceipt,
  refund_completed: IconArrowBack,
  refund_initiated: IconArrowBack,
};

const EVENT_COLORS: Record<string, string> = {
  payment_completed: "green",
  payment_initiated: "blue",
  payment_failed: "red",
  refund_completed: "orange",
  refund_initiated: "yellow",
};

export function PaywallTab() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState<string | null>(null);
  const selectedShopId = useAppStore((s) => s.selectedShopId);

  const { data: stats } = usePaywallStats(selectedShopId || undefined);
  const { data: events, isLoading } = usePaywallEvents({
    page,
    shopId: selectedShopId || undefined,
    eventType: eventType || undefined,
  });

  const chartData = stats?.map((s) => ({
    name: s.eventType.replace(/_/g, " "),
    count: Number(s.count),
  })) || [];

  return (
    <Stack>
      {/* Summary cards */}
      <SimpleGrid cols={{ base: 2, md: 5 }}>
        {stats?.map((stat) => {
          const Icon = EVENT_ICONS[stat.eventType] || IconReceipt;
          const color = EVENT_COLORS[stat.eventType] || "gray";
          return (
            <Card
              key={stat.eventType}
              withBorder
              style={{
                cursor: "pointer",
                borderColor: eventType === stat.eventType ? `var(--mantine-color-${color}-5)` : undefined,
              }}
              onClick={() => { setEventType(eventType === stat.eventType ? null : stat.eventType); setPage(1); }}
            >
              <Group>
                <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
                <div>
                  <Text size="xs" c="dimmed">{stat.eventType.replace(/_/g, " ")}</Text>
                  <Text fw={700} size="xl">{Number(stat.count).toLocaleString()}</Text>
                  <Text size="xs" c="dimmed">
                    Ostatni: {dayjs(stat.lastOccurred).format("DD.MM HH:mm")}
                  </Text>
                </div>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card withBorder p="md">
          <Text fw={500} mb="sm">Zdarzenia wg typu</Text>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--mantine-color-blue-6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filter */}
      <Group>
        <Select
          placeholder="Filtruj po typie"
          data={stats?.map((s) => ({ value: s.eventType, label: s.eventType.replace(/_/g, " ") })) || []}
          value={eventType}
          onChange={(v) => { setEventType(v); setPage(1); }}
          clearable
          w={250}
        />
      </Group>

      {/* Events table */}
      <DataTable
        records={events?.data || []}
        fetching={isLoading}
        columns={[
          {
            accessor: "eventType",
            title: "Typ",
            width: 180,
            render: ({ eventType }) => (
              <Badge color={EVENT_COLORS[eventType] || "gray"} size="sm">
                {eventType.replace(/_/g, " ")}
              </Badge>
            ),
          },
          { accessor: "shopName", title: "Sklep", width: 150 },
          {
            accessor: "payload",
            title: "Dane",
            render: ({ payload }) => {
              const p = payload as Record<string, unknown>;
              const parts = [];
              if (p.amount) parts.push(`${p.amount} ${p.currency || "PLN"}`);
              if (p.method) parts.push(String(p.method));
              if (p.orderId) parts.push(`#${p.orderId}`);
              return <Text size="sm">{parts.join(" | ") || "-"}</Text>;
            },
          },
          {
            accessor: "occurredAt",
            title: "Data",
            width: 150,
            render: ({ occurredAt }) => dayjs(occurredAt).format("DD.MM HH:mm:ss"),
          },
        ]}
        highlightOnHover
        noRecordsText="Brak zdarzen"
        minHeight={200}
        rowExpansion={{
          content: ({ record }) => (
            <Stack p="md" gap="xs">
              <Text size="sm" fw={500}>Pelne dane:</Text>
              <Code block>{JSON.stringify(record.payload, null, 2)}</Code>
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
