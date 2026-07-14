import { useState } from "react";
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
} from "@mantine/core";
import { IconShield, IconAlertCircle } from "@tabler/icons-react";
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
    <Container size={420} my={80}>
      <Stack align="center" mb="lg">
        <IconShield size={48} color="var(--mantine-color-blue-6)" />
        <Title order={2}>Plugin Monitor</Title>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
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
            />
            <PasswordInput
              label="Haslo"
              placeholder="Twoje haslo"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            <Button type="submit" fullWidth loading={login.isPending}>
              Zaloguj sie
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
