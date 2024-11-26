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
  TouchableWithoutFeedback,
} from "react-native";
import Feed from "./src/components/Feed";
import PostForm from "./src/components/PostForm";
import Login from "./src/components/Login";
import ReactionList from "./src/screens/Reacoes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import CommentsScreen from "./src/screens/Comments";
import { RootStackParamList } from "./src/types";
import { enableScreens } from "react-native-screens";
import MainLayout from "./src/screens/MainLayout"; // O layout com o Navbar
import CalendarEvents from "./src/components/CalendarioEventos";
import CalendarHolidays from "./src/components/CalendarioFerias";
import CalendarBirthdays from "./src/components/CalendarioAniversarios";
import { Text} from "react-native";
import { AppState } from "react-native";

import * as Device from "expo-device";


enableScreens();
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
    loadFontsAndAuth();
    setupNotificationListeners();

    const appStateListener = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      appStateListener.remove();
    };
  }, []);

  const loadFontsAndAuth = async () => {
    try {
      console.log("Carregando fontes e autenticação...");
      await Font.loadAsync({
        Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
      });

      const token = await AsyncStorage.getItem("token");
      setInitialRoute(token ? "Feed" : "Login");
      console.log(`Token de autenticação encontrado: ${token ? "Sim" : "Não"}`);
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
      console.log("Configurando listeners de notificações...");
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Permissões de notificação não concedidas.");
        return;
      }

      console.log("Permissões de notificação concedidas.");

      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
        projectId: "ecf65d93-030d-40c4-9c90-1bc55efa9eaf",
      });
      console.log("Token Expo Push obtido:", expoPushToken);

      Notifications.addNotificationReceivedListener(async (notification) => {
        console.log("Notificação recebida:", notification);

        const badgeCount = notification.request.content.badge || 0;
        await Notifications.setBadgeCountAsync(badgeCount);
        console.log(`Badge atualizado para ${badgeCount}`);
      });

      Notifications.addNotificationResponseReceivedListener(async (response) => {
        console.log("Notificação interagida:", response);

        await markNotificationsAsRead();
        await updateBadgeCount();
      });

      await updateBadgeCount();
    } catch (error) {
      console.error("Erro ao configurar notificações:", error);
    }
  };

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === "active") {
      console.log("App voltou para o estado ativo. Resetando o badge...");
      await resetBadgeCountOnAppOpen();
    }
  };

  const resetBadgeCountOnAppOpen = async () => {
    try {
      console.log("Resetando o badge ao abrir o aplicativo...");
      const userId = await AsyncStorage.getItem("userId");

      // Sempre reseta o badge localmente
      await Notifications.setBadgeCountAsync(0);
      console.log("Badge no dispositivo resetado para 0.");

      if (!userId) {
        console.warn("Usuário não autenticado. Pulando a marcação de notificações como lidas no backend.");
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
        console.log("Notificações marcadas como lidas no backend com sucesso.");
      } else {
        console.error("Erro ao marcar notificações como lidas no backend:", response.statusText);
      }
    } catch (error) {
      console.error("Erro ao resetar badge ou marcar notificações como lidas:", error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      console.log("Marcando notificações como lidas...");
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
        console.log("Notificações marcadas como lidas no backend.");
      } else {
        console.error("Erro ao marcar notificações como lidas no backend.");
      }
    } catch (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
    }
  };

  const updateBadgeCount = async () => {
    try {
      console.log("Atualizando o badge count...");
      const userId = await AsyncStorage.getItem("userId");

      if (!userId) {
        console.warn("Usuário não autenticado. Não é possível atualizar o badge.");
        await Notifications.setBadgeCountAsync(0);
        return;
      }

      const response = await fetch(
        `https://cemear-b549eb196d7c.herokuapp.com/notifications/unread-count/${userId}`
      );
      const data = await response.json();

      const unreadCount = data.unreadCount || 0;
      console.log(`Número de notificações não lidas: ${unreadCount}`);

      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error("Erro ao buscar notificações não lidas:", error);
    }
  };


  if (!fontsLoaded || loadingAuth) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, gestureEnabled: true }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Feed">
          {() => (
            <MainLayout>
              <Feed />
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
        <Stack.Screen name="ReactionList">
          {() => (
            <MainLayout>
              <ReactionList />
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
          const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
          const navigation = useNavigation();
        
          useEffect(() => {
            const fetchTipoUsuario = async () => {
              const tipo = await AsyncStorage.getItem("tipoUsuario");
              setTipoUsuario(tipo);
            };
            fetchTipoUsuario();
          }, []);
        
          const openCalendar = (screen: string) => {
            setShowCalendarModal(false);
            navigation.navigate(screen as never); // Navega para a tela correspondente
          };

          useEffect(() => {
            const resetBadgeCount = async () => {
              console.log("Resetando badge count...");
              await Notifications.setBadgeCountAsync(0); // Zera o badge
            };
          
            resetBadgeCount(); // Chama a função ao carregar o Feed
          }, []);
          
        
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
  <TouchableWithoutFeedback onPress={() => setShowCalendarModal(false)}>
    <View style={styles.calendarModalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.calendarModal}>
          <View style={styles.modalTitle}>
            <Text>Escolha o Calendário</Text>
          </View>

          <TouchableOpacity
            style={styles.calendarOption}
            onPress={() => openCalendar("CalendarEvents")}
          >
            <Ionicons name="calendar-outline" size={24} color="black" />
            <Text style={styles.optionText}>Calendário de Eventos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calendarOption}
            onPress={() => openCalendar("CalendarHolidays")}
          >
            <Ionicons name="calendar-outline" size={24} color="black" />
            <Text style={styles.optionText}>Calendário de Férias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calendarOption}
            onPress={() => openCalendar("CalendarBirthdays")}
          >
            <Ionicons name="calendar-outline" size={24} color="black" />
            <Text style={styles.optionText}>Calendário de Aniversários</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCalendarModal(false)}
          >
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

        
              {/* Botões inferiores */}
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  onPress={() => console.log("Home")}
                  style={styles.iconContainer}
                >
                  <Ionicons name="home-outline" size={24} color="black" />
                </TouchableOpacity>
                {tipoUsuario === "admin" && (
                  <TouchableOpacity
                    onPress={() => setShowPostForm(true)}
                    style={styles.iconContainer}
                  >
                    <Ionicons name="add-circle-outline" size={34} color="black" />
                  </TouchableOpacity>
                )}
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  
  calendarOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#007AFF",
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});

export default App;
