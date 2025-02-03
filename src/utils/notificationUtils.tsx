import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import axios from "axios";
import { Platform } from "react-native";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

export const registerForPushNotificationsAsync = async (userId: string): Promise<void> => {
  try {
    console.log("Iniciando registro para notificações...");

    if (!Device.isDevice) {
      console.warn("Notificações push não são suportadas em emuladores.");
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("Solicitando permissões para notificações...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permissões para notificações não foram concedidas.");
      return;
    }

    console.log("Permissões concedidas. Gerando token...");

    let pushToken: string | null = null;

    if (Platform.OS === "android") {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      pushToken = tokenData.data;
    } else {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      pushToken = tokenData.data;
    }

    if (!pushToken) {
      console.error("Erro: Token não foi gerado.");
      return;
    }

    console.log("Token gerado:", pushToken);

    const deviceName = Device.deviceName || "Desconhecido";
    const devicePlatform = Platform.OS;

    const response = await axios.post(`${BASE_URL}/registerPushToken`, {
      userId,
      pushToken,
      deviceName,
      devicePlatform,
    });

    if (response.status === 200) {
      console.log("Token registrado no backend com sucesso.");
    } else {
      console.warn("Erro ao registrar o token no backend:", response.data);
    }
  } catch (error) {
    console.error("Erro ao registrar notificações push:", error.message);
  }
};
