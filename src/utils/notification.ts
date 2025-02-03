import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import axios from "axios";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

// Registra notificações push com validações apropriadas
export const registerForPushNotificationsAsync = async (): Promise<boolean> => {
  try {
    console.log("Solicitando permissões para notificações...");

    if (!Device.isDevice) {
      console.warn("Notificações push não são suportadas em emuladores.");
      return false;
    }

    // Verifica se a permissão já foi concedida anteriormente
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("Solicitando permissões ao usuário...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permissão para notificações push não foi concedida.");
      return false;
    }

    console.log("Permissões concedidas! Verificando token...");

    // Sempre gera um novo token ao invés de reutilizar para garantir validade
    const newToken = await generateAndSaveNewToken();
    if (!newToken) {
      console.error("Falha ao obter um token válido.");
      return false;
    }

    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      console.warn("Usuário não autenticado. Token não será enviado.");
      return false;
    }

    const deviceName = Device.deviceName || "Desconhecido";
    const devicePlatform = Platform.OS;

    console.log("Enviando token atualizado para o backend...");
    await axios.post(`${BASE_URL}/registerPushToken`, {
      userId,
      firebaseToken: newToken,
      deviceName,
      devicePlatform,
    });

    console.log("Token enviado com sucesso para o backend.");
    return true;
  } catch (error) {
    console.error("Erro ao registrar notificações push:", error);
    return false;
  }
};

const generateAndSaveNewToken = async (): Promise<string | null> => {
  try {
    let tokenData;
    if (Platform.OS === "android") {
      tokenData = await Notifications.getDevicePushTokenAsync();
    } else {
      tokenData = await Notifications.getExpoPushTokenAsync();
    }

    const newToken = tokenData.data;
    console.log("Novo token gerado:", newToken);

    // Armazena sempre o novo token
    await AsyncStorage.setItem("firebasePushToken", newToken);
    return newToken;
  } catch (error) {
    console.error("Erro ao gerar novo token:", error);
    return null;
  }
};
