import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme, MantineColorsTuple } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "mantine-datatable/styles.css";

const planetpayBlue: MantineColorsTuple = [
  "#e5f4ff",
  "#cce5fa",
  "#99c9f2",
  "#63abeb",
  "#3792e5",
  "#1a82e0",
  "#007ecc",
  "#006db5",
  "#0060a3",
  "#005290",
];

const planetpayMagenta: MantineColorsTuple = [
  "#ffe5f2",
  "#fccce0",
  "#f599bf",
  "#f0639c",
  "#f50084",
  "#d0006f",
  "#b80063",
  "#9e0055",
  "#85004a",
  "#6d003d",
];

const theme = createTheme({
  primaryColor: "planetpayBlue",
  colors: {
    planetpayBlue,
    planetpayMagenta,
  },
  fontFamily: "'Montserrat', 'Roboto', sans-serif",
  headings: {
    fontFamily: "'Montserrat', 'Roboto', sans-serif",
  },
  defaultRadius: "sm",
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);
