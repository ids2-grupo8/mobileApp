import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/hooks/use-theme";
import { type PinAccount, pinAccountsRequest } from "@/services/auth";
import { getOrCreateDeviceId } from "@/services/device";
import { useAuthStore } from "@/store/auth";

type Step = "loading" | "no-pin" | "select-account" | "enter-pin";

export default function PinLoginScreen() {
  const router = useRouter();
  const C = useTheme();
  const { loginWithPin, isLoading, error, clearError } = useAuthStore();

  const isLocked = error?.includes("bloqueado") ?? false;

  const [step, setStep] = useState<Step>("loading");
  const [accounts, setAccounts] = useState<PinAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PinAccount | null>(null);
  const [pin, setPin] = useState("");

  useEffect(() => {
    void loadAccounts();
    return () => clearError();
  }, [clearError]);

  const loadAccounts = async () => {
    try {
      const deviceId = await getOrCreateDeviceId();
      const list = await pinAccountsRequest(deviceId);
      if (list.length === 0) {
        setStep("no-pin");
      } else if (list.length === 1) {
        setSelectedAccount(list[0]);
        setStep("enter-pin");
      } else {
        setAccounts(list);
        setStep("select-account");
      }
    } catch {
      setStep("no-pin");
    }
  };

  const onSelectAccount = (account: PinAccount) => {
    setSelectedAccount(account);
    setStep("enter-pin");
  };

  const onSubmit = async () => {
    if (!selectedAccount) return;
    clearError();
    await loginWithPin(pin, selectedAccount.user_id);
  };

  const goToLogin = () => router.replace("/(auth)/login");

  if (step === "loading") {
    return (
      <View style={[s.root, { backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (step === "no-pin") {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <Text style={[s.title, { color: C.textPrimary }]}>PIN no configurado</Text>
        <Text style={[s.subtitle, { color: C.textSecondary }]}>
          Todavía no configuraste un PIN para este dispositivo. Iniciá sesión y luego configuralo desde tu perfil.
        </Text>
        <TouchableOpacity style={[s.button, { backgroundColor: C.accent }]} onPress={goToLogin}>
          <Text style={s.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "select-account") {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <Text style={[s.title, { color: C.textPrimary }]}>¿Con qué cuenta querés ingresar?</Text>
        <Text style={[s.subtitle, { color: C.textSecondary }]}>
          Este dispositivo tiene varias cuentas con PIN configurado.
        </Text>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.user_id}
            style={[s.accountItem, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
            onPress={() => onSelectAccount(account)}
          >
            <Text style={[s.accountName, { color: C.textPrimary }]}>{account.full_name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={goToLogin}>
          <Text style={[s.link, { color: C.accentText }]}>Usar email y contraseña</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <Text style={[s.title, { color: C.textPrimary }]}>Ingresá con PIN</Text>
        {selectedAccount && (
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            {selectedAccount.full_name}
          </Text>
        )}

        {!!error && (
          <Text style={[s.error, { color: C.red }]}>
            {isLocked
              ? error
              : "PIN incorrecto. Revisá el PIN que ingresaste."}
          </Text>
        )}

        <TextInput
          style={[s.input, { color: C.textPrimary, borderColor: C.glassBorder, backgroundColor: C.glass }, isLocked && s.disabled]}
          value={pin}
          onChangeText={(value) => setPin(value.replace(/[^\d]/g, ""))}
          placeholder="PIN de 6 dígitos"
          placeholderTextColor={C.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          editable={!isLocked}
        />

        <TouchableOpacity
          style={[s.button, { backgroundColor: C.accent }, (isLoading || isLocked) && s.disabled]}
          onPress={onSubmit}
          disabled={isLoading || pin.length < 6 || isLocked}
        >
          {isLoading ? (
            <ActivityIndicator color="#403c30" size="small" />
          ) : (
            <Text style={s.buttonText}>Entrar con PIN</Text>
          )}
        </TouchableOpacity>

        {accounts.length > 1 && (
          <TouchableOpacity onPress={() => { setStep("select-account"); setPin(""); clearError(); }}>
            <Text style={[s.link, { color: C.accentText }]}>Cambiar cuenta</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={goToLogin}>
          <Text style={[s.link, { color: C.accentText }]}>Usar email y contraseña</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 4,
  },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#050508", fontWeight: "800", fontSize: 16 },
  link: { textAlign: "center", fontWeight: "600", marginTop: 4 },
  error: { fontSize: 13 },
  disabled: { opacity: 0.6 },
  accountItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  accountName: { fontSize: 16, fontWeight: "600" },
});
