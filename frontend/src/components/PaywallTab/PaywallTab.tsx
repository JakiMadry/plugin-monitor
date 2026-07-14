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
  Box,
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

const cardStyle = {
  border: "1px solid #dadada",
  borderRadius: "0.375rem",
  backgroundColor: "#fff",
};

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

const EVENT_HEX: Record<string, string> = {
  payment_completed: "#00c259",
  payment_initiated: "#007ecc",
  payment_failed: "#f50084",
  refund_completed: "#fdb82b",
  refund_initiated: "#fdb82b",
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
          const hex = EVENT_HEX[stat.eventType] || "#a4a6b3";
          return (
            <Card
              key={stat.eventType}
              style={{
                ...cardStyle,
                cursor: "pointer",
                borderTop: `3px solid ${hex}`,
                borderColor: eventType === stat.eventType ? hex : "#dadada",
                borderTopColor: hex,
              }}
              p="md"
              onClick={() => { setEventType(eventType === stat.eventType ? null : stat.eventType); setPage(1); }}
            >
              <Group>
                <Box style={{ backgroundColor: `${hex}15`, borderRadius: "0.375rem", padding: 8 }}>
                  <Icon size={24} color={hex} />
                </Box>
                <div>
                  <Text size="xs" c="dimmed" fw={500}>{stat.eventType.replace(/_/g, " ")}</Text>
                  <Text fw={700} size="xl" style={{ color: "#171a1e" }}>{Number(stat.count).toLocaleString()}</Text>
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
        <Card style={cardStyle} p="md">
          <Text fw={600} mb="sm" style={{ color: "#171a1e" }}>Zdarzenia wg typu</Text>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dadada" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: "#171a1e" }} />
              <YAxis tick={{ fill: "#171a1e" }} />
              <Tooltip />
              <Bar dataKey="count" fill="#007ecc" radius={[4, 4, 0, 0]} />
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
          styles={{
            input: { borderColor: "#dadada", fontSize: "0.875rem" },
          }}
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
            <Stack p="md" gap="xs" style={{ backgroundColor: "#f7f8fc" }}>
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
