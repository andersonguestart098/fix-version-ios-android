import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import Navbar from "./src/components/NavBar";
import Feed from "./src/components/Feed";
import PostForm from "./src/components/PostForm";
import Login from "./src/components/Login";
import ReactionList from "./src/screens/Reacoes"; // Importa a nova tela ReactionList
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { enableScreens } from "react-native-screens";
import CommentsScreen from "./src/screens/Comments";
import { RootStackParamList } from "./src/types"; // ou "./types.d.ts" dependendo do caminho correto


enableScreens();
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>(); // Tipagem adicionada para segurança

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
  }, []);

  const loadFontsAndAuth = async () => {
    try {
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

  const setupNotificationListeners = () => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notificação recebida em foreground:", notification);
        Alert.alert("Nova Notificação", notification.request.content.body || "");
      }
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Resposta à notificação:", response);
        Alert.alert("Notificação Interagida", "Usuário clicou na notificação.");
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
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
    <Stack.Screen name="Feed" component={FeedScreen} />
    <Stack.Screen name="ReactionList" component={ReactionList} />
    <Stack.Screen name="Comments" component={CommentsScreen} />
  </Stack.Navigator>
</NavigationContainer>


  );
};

const FeedScreen: React.FC = () => {
  const [showPostForm, setShowPostForm] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <Feed />

      {/* Modal para o formulário de Post */}
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

      {/* Botões de navegação na parte inferior */}
      <View style={styles.footerButtons}>
        <TouchableOpacity onPress={() => setShowPostForm(false)}>
          <Ionicons name="home-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPostForm(true)}>
          <Ionicons name="add-circle-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log("Likes")}>
          <Ionicons name="heart-outline" size={24} color="black" />
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});


export default App;
