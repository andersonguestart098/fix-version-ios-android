import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  Platform,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { enableScreens } from "react-native-screens";

import Feed from "./src/components/Feed";
import PostForm from "./src/components/PostForm";
import Login from "./src/components/Login";
import ReactionList from "./src/screens/Reacoes";
import CommentsScreen from "./src/screens/Comments";
import CalendarEvents from "./src/components/CalendarioEventos";
import CalendarHolidays from "./src/components/CalendarioFerias";
import CalendarBirthdays from "./src/components/CalendarioAniversarios";
import MainLayout from "./src/screens/MainLayout";
import { RootStackParamList } from "./src/types";

enableScreens();
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configuração do comportamento de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initialRoute, setInitialRoute] = useState<"Login" | "Feed">("Login");
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    loadFontsAndAuth();
    setupNotificationListeners();
  }, []);

  const loadFontsAndAuth = async () => {
    try {
      // Carrega as fontes necessárias
      await Font.loadAsync({
        Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
      });

      const token = await AsyncStorage.getItem("token");
      setInitialRoute(token ? "Feed" : "Login");
      setFontsLoaded(true);
    } catch (error) {
      console.error("Erro ao carregar fontes ou autenticação:", error);
    } finally {
      setLoadingAuth(false);
      await SplashScreen.hideAsync();
    }
  };

  const setupNotificationListeners = async () => {
    try {
      console.log("Configurando notificações...");

      // Solicita permissões de notificações
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Permissões de notificações não concedidas.");
        return;
      }

      console.log("Permissões de notificações concedidas.");

      // Obter token Expo Push
      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
        projectId: "ecf65d93-030d-40c4-9c90-1bc55efa9eaf", // Substitua pelo seu Project ID
      });
      console.log("Token Expo Push obtido:", expoPushToken);

      // Informações do dispositivo
      const devicePlatform = Platform.OS;
      const deviceName = Device.modelName || "Unknown Device";

      console.log("Plataforma:", devicePlatform, "| Dispositivo:", deviceName);

      // Registrar o token no backend
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        console.log("Registrando token no backend para userId:", userId);

        const response = await fetch("https://cemear-b549eb196d7c.herokuapp.com/registerPushToken", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            expoPushToken,
            deviceName,
            devicePlatform,
          }),
        });

        if (response.ok) {
          console.log("Token registrado com sucesso no backend.");
        } else {
          const errorDetails = await response.json();
          console.error("Erro ao registrar token no backend:", errorDetails);
        }
      } else {
        console.warn("Nenhum userId encontrado no AsyncStorage.");
      }

      // Listener para notificações recebidas enquanto o app está aberto
      const subscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notificação recebida:", notification);
        Alert.alert(
          notification.request.content.title || "Notificação",
          notification.request.content.body || ""
        );
      });

      // Listener para interações com notificações
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Interação com notificação:", response);
        const postId = response.notification.request.content.data.postId;
        if (postId) {
          console.log(`Abrindo post com ID: ${postId}`);
          // Exemplo: Navegar para a tela correspondente
        }
      });

      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error("Erro ao configurar notificações:", error);
    }
  };

  if (!fontsLoaded || loadingAuth) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Feed">
          {() => (
            <MainLayout>
              <FeedScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="ReactionList">
          {() => (
            <MainLayout>
              <ReactionList />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Comments">
          {() => (
            <MainLayout>
              <CommentsScreen />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="CalendarHolidays">
          {() => (
            <MainLayout>
              <CalendarHolidays />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="CalendarEvents">
          {() => (
            <MainLayout>
              <CalendarEvents />
            </MainLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="CalendarBirthdays">
          {() => (
            <MainLayout>
              <CalendarBirthdays />
            </MainLayout>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const FeedScreen: React.FC = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const navigation = useNavigation();

  const openCalendar = (screen: string) => {
    setShowCalendarModal(false);
    navigation.navigate(screen as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Feed />

      {/* Modal para o formulário de postagem */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPostForm}
        onRequestClose={() => setShowPostForm(false)}
      >
        <View style={styles.modalContainer}>
          <PostForm onClose={() => setShowPostForm(false)} />
        </View>
      </Modal>

      {/* Modal para escolher o calendário */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCalendarModal}
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModal}>
            <Text style={styles.modalTitle}>Escolha o Calendário</Text>
            <TouchableOpacity
              style={styles.calendarOption}
              onPress={() => openCalendar("CalendarEvents")}
            >
              <Text style={styles.optionText}>Calendário de Eventos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calendarOption}
              onPress={() => openCalendar("CalendarHolidays")}
            >
              <Text style={styles.optionText}>Calendário de Férias</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calendarOption}
              onPress={() => openCalendar("CalendarBirthdays")}
            >
              <Text style={styles.optionText}>Calendário de Aniversários</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCalendarModal(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Botões inferiores */}
      <View style={styles.footerButtons}>
        <TouchableOpacity
          onPress={() => console.log("Home")}
          style={styles.iconContainer}
        >
          <Ionicons name="home-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowPostForm(true)}
          style={styles.iconContainer}
        >
          <Ionicons name="add-circle-outline" size={34} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowCalendarModal(true)}
          style={styles.iconContainer}
        >
          <Ionicons name="calendar-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  iconContainer: { justifyContent: "center", alignItems: "center" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  calendarModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  calendarOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
    alignItems: "center",
  },
  optionText: { fontSize: 16, color: "#007AFF" },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: { color: "#FFFFFF", fontSize: 16 },
});

export default App;
