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
  
      // Pergunta ao usuário sobre notificações após login bem-sucedido
      setTimeout(() => {
        Alert.alert(
          "Notificações",
          "Deseja permitir notificações para receber atualizações?",
          [
            {
              text: "Não",
              style: "cancel",
            },
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
      console.error(
        "Erro ao buscar avatar do usuário:",
        error.response?.data || error.message
      );
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