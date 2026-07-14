import { useState } from "react";
import {
  Box,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Text,
  Group,
} from "@mantine/core";
import { IconShieldCheck, IconAlertCircle } from "@tabler/icons-react";
import { useLogin } from "../api/hooks";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate("/") }
    );
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Left brand panel */}
      <Box
        style={{
          width: "45%",
          backgroundColor: "#0f1d3f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "3rem",
        }}
      >
        <IconShieldCheck size={72} color="#007ecc" />
        <Title
          order={1}
          mt="lg"
          style={{ color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
        >
          Plugin Monitor
        </Title>
        <Text
          size="md"
          mt="sm"
          style={{ color: "#a4a6b3", textAlign: "center", maxWidth: 320 }}
        >
          Monitoring wtyczek platnosci i domen hazardowych
        </Text>
      </Box>

      {/* Right login panel */}
      <Box
        style={{
          flex: 1,
          backgroundColor: "#f2f5fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <Paper
          shadow="lg"
          p={40}
          style={{
            width: 450,
            maxWidth: "100%",
            borderRadius: "0.375rem",
            border: "1px solid #dadada",
          }}
        >
          {/* Header */}
          <Box
            style={{
              textAlign: "center",
              marginBottom: "2rem",
            }}
          >
            <Group justify="center" mb="xs">
              <IconShieldCheck size={32} color="#007ecc" />
            </Group>
            <Title
              order={3}
              style={{ fontFamily: "'Montserrat', sans-serif", color: "#171a1e" }}
            >
              Zaloguj sie
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Wprowadz dane logowania
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack>
              {login.isError && (
                <Alert icon={<IconAlertCircle />} color="red" title="Logowanie nieudane">
                  {login.error.message}
                </Alert>
              )}
              <TextInput
                label="Email"
                placeholder="admin@pluginmonitor.pl"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                styles={{
                  input: {
                    backgroundColor: "rgba(51,51,51,0.06)",
                    border: "none",
                    borderRadius: 0,
                    fontSize: "0.875rem",
                    height: 44,
                  },
                  label: {
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    marginBottom: 4,
                    color: "#171a1e",
                  },
                }}
              />
              <PasswordInput
                label="Haslo"
                placeholder="Twoje haslo"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                styles={{
                  input: {
                    backgroundColor: "rgba(51,51,51,0.06)",
                    border: "none",
                    borderRadius: 0,
                    fontSize: "0.875rem",
                    height: 44,
                  },
                  innerInput: {
                    height: 44,
                  },
                  label: {
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    marginBottom: 4,
                    color: "#171a1e",
                  },
                }}
              />
              <Button
                type="submit"
                fullWidth
                loading={login.isPending}
                size="md"
                style={{
                  backgroundColor: "#007ecc",
                  borderRadius: "0.375rem",
                  height: 44,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                }}
                styles={{
                  root: {
                    "&:hover": {
                      backgroundColor: "#2691d4",
                    },
                  },
                }}
              >
                Zaloguj sie
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Box>
  );
}
