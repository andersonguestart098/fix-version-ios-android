import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import axios from "axios";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

// Função para registrar notificações push no Expo e FCM
export const registerForPushNotificationsAsync = async (): Promise<boolean> => {
  try {
    console.log("🔔 Solicitando permissões para notificações...");

    if (!Device.isDevice) {
      console.warn("❌ Notificações push não são suportadas em emuladores.");
      return false;
    }

    // Verifica permissões
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("🔓 Solicitando permissões ao usuário...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("❌ Permissão para notificações push não foi concedida.");
      return false;
    }

    console.log("✅ Permissões concedidas! Gerando token...");
    const { expoPushToken, firebaseToken } = await getPushToken();

    if (!expoPushToken && !firebaseToken) {
      console.error("⚠️ Falha ao obter um token válido.");
      return false;
    }

    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      console.warn("⚠️ Usuário não autenticado. Token não será enviado.");
      return false;
    }

    const deviceName = Device.deviceName || "Desconhecido";
    const devicePlatform = Platform.OS;

    console.log("📡 Enviando token atualizado para o backend...");
    await axios.post(`${BASE_URL}/registerPushToken`, {
      userId,
      firebaseToken, // Apenas para Android
      expoPushToken, // Apenas para iOS
      deviceName,
      devicePlatform,
    });

    console.log("✅ Token enviado com sucesso para o backend.");
    return true;
  } catch (error) {
    console.error("❌ Erro ao registrar notificações push:", error);
    return false;
  }
};

// Obtém ou gera um novo push token
const getPushToken = async (): Promise<{ expoPushToken: string | null; firebaseToken: string | null }> => {
  try {
    let expoPushToken = null;
    let firebaseToken = null;

    if (Platform.OS === "android") {
      console.log("📌 Obtendo Firebase Cloud Messaging Token...");
      firebaseToken = (await Notifications.getDevicePushTokenAsync()).data;
      await AsyncStorage.setItem("firebasePushToken", firebaseToken);
    } else if (Platform.OS === "ios") {
      console.log("📌 Obtendo Expo Push Token...");
      
      // Aqui está a correção 👇👇👇
      expoPushToken = (await Notifications.getExpoPushTokenAsync({
        projectId: "ecf65d93-030d-40c4-9c90-1bc55efa9eaf", // seu projectId do EAS
      })).data;

      await AsyncStorage.setItem("expoPushToken", expoPushToken);
    }

    console.log("📌 Token gerado:", { expoPushToken, firebaseToken });

    return { expoPushToken, firebaseToken };
  } catch (error) {
    console.error("❌ Erro ao gerar novo token:", error);
    return { expoPushToken: null, firebaseToken: null };
  }
};

