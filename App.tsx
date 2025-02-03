import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, ActivityIndicator, Platform, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeedScreen from "./src/screens/FeedScreen";
import Login from "./src/components/Login";
import ReactionList from "./src/screens/Reacoes";
import CommentsScreen from "./src/screens/Comments";
import CalendarEvents from "./src/components/CalendarioEventos";
import CalendarHolidays from "./src/components/CalendarioFerias";
import CalendarBirthdays from "./src/components/CalendarioAniversarios";
import Navbar from "./src/components/NavBar";
import { AppState } from "react-native";
import { RootStackParamList } from "./src/types";
import { registerForPushNotificationsAsync } from "./src/utils/notification";
import * as Device from "expo-device";
import Constants from "expo-constants";
import axios from "axios";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});




const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initialRoute, setInitialRoute] = useState<"Login" | "Feed">("Login");
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const configureApp = async () => {
      // Carrega fontes e autenticação
      await loadFontsAndAuth();
  
    };
  
    configureApp();
  
    const appStateListener = AppState.addEventListener("change", handleAppStateChange);
  
    return () => {
      appStateListener.remove();
    };
  }, []);

useEffect(() => {
  const initializeApp = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      console.log("Usuário autenticado, registrando push notifications...");
      await registerForPushNotificationsAsync();
    }
  };

  initializeApp();
}, []);


  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notificação recebida:", notification);
    });
  
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Usuário interagiu com a notificação:", response);
    });
  
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
  
  

  const loadFontsAndAuth = async () => {
    try {
      await Font.loadAsync({
        Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
      });

      const token = await AsyncStorage.getItem("token");
      setInitialRoute(token ? "Feed" : "Login");
      setFontsLoaded(true);

      // Reseta o badge ao carregar o app
      await resetBadgeAndMarkAsRead(token);
    } catch (error) {
      console.error("Erro ao carregar fontes ou autenticação:", error);
    } finally {
      setLoadingAuth(false);
      await SplashScreen.hideAsync();
    }
  };

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === "active") {
      console.log("Aplicativo ativo, resetando badge...");
      const token = await AsyncStorage.getItem("token");
      await resetBadgeAndMarkAsRead(token);
    }
  };

  const resetBadgeAndMarkAsRead = async (token: string | null) => {
    try {
      await Notifications.setBadgeCountAsync(0); // Reseta o badge local
      console.log("Badge resetado com sucesso.");
  
      // Se o usuário está logado, usa o userId
      if (token) {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
          console.warn("Usuário não autenticado. Não é possível marcar notificações como lidas.");
          return;
        }
  
        const response = await fetch(
          "https://cemear-b549eb196d7c.herokuapp.com/notifications/mark-as-read",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          }
        );
  
        if (response.ok) {
          console.log("Notificações marcadas como lidas no backend (usuário autenticado).");
        } else {
          const errorDetails = await response.json();
          console.error(
            "Erro ao marcar notificações como lidas no backend (usuário autenticado):",
            errorDetails
          );
        }
      } else {
        console.log("Usuário deslogado. Nenhuma ação necessária para notificações.");
      }
    } catch (error) {
      console.error("Erro ao resetar badge ou marcar notificações como lidas:", error);
    }
  };
  
  

  if (!fontsLoaded || loadingAuth) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Tela de Login sem Navbar */}
          <Stack.Screen name="Login" component={Login} />

          {/* Feed com Navbar */}
          <Stack.Screen name="Feed">
            {() => (
              <SafeAreaView style={styles.container}>
                
                <FeedScreen />
              </SafeAreaView>
            )}
          </Stack.Screen>

          {/* Outras Telas com Navbar */}
          <Stack.Screen name="ReactionList">
            {() => (
              <SafeAreaView style={styles.container}>
                <Navbar />
                <ReactionList />
              </SafeAreaView>
            )}
          </Stack.Screen>
          <Stack.Screen name="Comments">
            {() => (
              <SafeAreaView style={styles.container}>
                <Navbar />
                <CommentsScreen />
              </SafeAreaView>
            )}
          </Stack.Screen>
          <Stack.Screen name="CalendarHolidays">
            {() => (
              <SafeAreaView style={styles.container}>
                <Navbar />
                <CalendarHolidays />
              </SafeAreaView>
            )}
          </Stack.Screen>
          <Stack.Screen name="CalendarEvents">
            {() => (
              <SafeAreaView style={styles.container}>
                <Navbar />
                <CalendarEvents />
              </SafeAreaView>
            )}
          </Stack.Screen>
          <Stack.Screen name="CalendarBirthdays">
            {() => (
              <SafeAreaView style={styles.container}>
                <Navbar />
                <CalendarBirthdays />
              </SafeAreaView>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
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
    zIndex: 10, // Garante que fique acima de outros elementos
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
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
    elevation: 4, // Sombra para destacar no Android
    shadowColor: "#000", // Sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  calendarOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15, // Espaçamento maior para melhor toque
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 10, // Adiciona espaçamento lateral
  },
  optionText: {
    fontSize: 16,
    color: "#007AFF",
    flex: 1, // Ocupa espaço restante para melhor alinhamento
    textAlign: "left", // Alinha texto à esquerda
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600", // Deixa o texto mais destacado
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
});


export default App;