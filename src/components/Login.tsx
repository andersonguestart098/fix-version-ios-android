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

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

const Login: React.FC = () => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

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

      await fetchUserAvatar(userId);
      await registerForPushNotifications();

      navigation.reset({
        index: 0,
        routes: [{ name: "Feed" as never }],
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Trata erros específicos de status
        switch (error.response?.status) {
          case 400:
            Alert.alert("Erro", "Credenciais inválidas");
            break;
          case 401:
            Alert.alert("Erro", "Credenciais inválidas");
            break;
          default:
            Alert.alert(
              "Erro",
              error.response?.data?.msg || "Falha no login. Tente novamente."
            );
            break;
        }
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

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        Alert.alert("Erro", "Notificações push só funcionam em dispositivos físicos.");
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert("Erro", "Permissões para notificações não concedidas.");
        return;
      }

      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
      const userId = await AsyncStorage.getItem("userId");

      if (!expoPushToken || !userId) {
        Alert.alert("Erro", "Não foi possível registrar para notificações.");
        return;
      }

      await axios.post(`${BASE_URL}/registerPushToken`, {
        userId,
        expoPushToken,
      });

      console.log("Push token registrado com sucesso:", expoPushToken);
    } catch (error: any) {
      console.error("Erro ao registrar push token:", error.response?.data || error.message);
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
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
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
