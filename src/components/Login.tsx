import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { registerForPushNotificationsAsync } from "../utils/notification";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

const Login: React.FC = () => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadSavedCredentials();
    checkAuthStatus();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedUsuario = await AsyncStorage.getItem("savedUsuario");
      const savedPassword = await AsyncStorage.getItem("savedPassword");
      if (savedUsuario && savedPassword) {
        setUsuario(savedUsuario);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais salvas:", error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Feed" as never }],
        });
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        usuario,
        password,
      });

      const { token, userId, tipoUsuario } = response.data;

      await AsyncStorage.multiSet([
        ["token", token],
        ["userId", userId],
        ["tipoUsuario", tipoUsuario],
      ]);

      if (rememberMe) {
        await AsyncStorage.multiSet([
          ["savedUsuario", usuario],
          ["savedPassword", password],
        ]);
      } else {
        await AsyncStorage.multiRemove(["savedUsuario", "savedPassword"]);
      }

      await fetchUserAvatar(userId);

      setTimeout(() => {
        Alert.alert(
          "Notificações",
          "Deseja permitir notificações para receber atualizações?",
          [
            { text: "Não", style: "cancel" },
            {
              text: "Sim",
              onPress: async () => {
                const notificationSuccess = await registerForPushNotificationsAsync();
                if (notificationSuccess) {
                  console.log("Notificações ativadas com sucesso.");
                } else {
                  console.warn("Falha ao ativar notificações.");
                }
              },
            },
          ]
        );
      }, 500);

      navigation.reset({
        index: 0,
        routes: [{ name: "Feed" as never }],
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorMsg =
          status === 400 || status === 401
            ? "Credenciais inválidas"
            : error.response?.data?.msg || "Erro no login. Tente novamente.";
        Alert.alert("Erro", errorMsg);
      } else {
        Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAvatar = async (userId: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/user/${userId}/avatar`);
      const { avatar } = response.data;
      await AsyncStorage.setItem("avatar", avatar);
    } catch (error) {
      console.error("Erro ao buscar avatar do usuário:", error.response?.data || error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Image source={require("../../assets/logo.png")} style={styles.logo} />

      <TextInput
        style={styles.input}
        placeholder="Usuário"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Senha"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye" : "eye-off"}
            size={24}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      {/* Checkbox personalizado */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setRememberMe(!rememberMe)}
      >
        <Ionicons
          name={rememberMe ? "checkbox" : "square-outline"}
          size={24}
          color={rememberMe ? "#0079bf" : "gray"}
        />
        <Text style={styles.checkboxLabel}>Lembrar-me</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  logo: {
    width: 125,
    height: 25,
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8, // Espaço entre o ícone e o texto
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#0079bf",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default Login;