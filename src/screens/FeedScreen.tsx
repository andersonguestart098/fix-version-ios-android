import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import Navbar from "../components/NavBar";
import Feed from "../components/Feed";
import PostForm from "../components/PostForm";
import NavButton from "../components/botoesNav";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native"; // Adicionar useFocusEffect
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { socketManager } from "../utils/socketManager";

const SOCKET_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
  id: string;
  content: string;
  createdAt: string;
  read: boolean;
  receiverId: string;
  senderId: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  messages: Message[];
  unreadCount: number;
}

const FeedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const hasFetchedConversations = React.useRef(false);

  // Inicialização inicial
  useEffect(() => {
    const initialize = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      const storedUserId = await AsyncStorage.getItem("userId");
      setTipoUsuario(tipo);

      if (storedUserId && !hasFetchedConversations.current) {
        setUserId(storedUserId);
        socketManager.connect(storedUserId); // Conectar o socket global
        await fetchConversations(storedUserId);
        hasFetchedConversations.current = true;
      }
    };

    initialize();

    return () => {
      socketManager.off("newMessage");
      socketManager.off("messagesRead");
    };
  }, []);

  // Listeners do socket
  useEffect(() => {
    if (!userId) return;

    socketManager.on("connect", () => {
      console.log("Socket conectado:", socketManager.getSocket()?.id);
      conversations.forEach((conv) => {
        socketManager.emit("joinConversation", conv.id);
        console.log(`Juntando-se à conversa ${conv.id}`);
      });
    });

    socketManager.on("newMessage", (message: Message) => {
      console.log("Nova mensagem recebida:", message);
      setConversations((prev) => {
        let conversationExists = false;
        const updatedConversations = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            conversationExists = true;
            const isNewForUser = message.receiverId === userId && !message.read;
            const updatedMessages = [...conv.messages, message]; // Ordem ascendente
            const newUnreadCount = isNewForUser ? (conv.unreadCount || 0) + 1 : conv.unreadCount;
            return {
              ...conv,
              messages: updatedMessages,
              unreadCount: newUnreadCount,
            };
          }
          return conv;
        });

        if (!conversationExists) {
          const newConversation = {
            id: message.conversationId,
            user1Id: message.senderId,
            user2Id: message.receiverId,
            messages: [message],
            unreadCount: message.receiverId === userId && !message.read ? 1 : 0,
          };
          updatedConversations.push(newConversation);
          socketManager.emit("joinConversation", message.conversationId);
          console.log(`Juntando-se à nova conversa ${message.conversationId}`);
        }

        const totalUnread = updatedConversations.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0
        );
        console.log("Total de não lidas após nova mensagem:", totalUnread);
        setUnreadMessages(totalUnread);
        return updatedConversations;
      });
    });

    socketManager.on("messagesRead", ({ conversationId, userId: readerId }) => {
      console.log("Mensagens lidas:", conversationId, readerId);
      if (readerId === userId) {
        setConversations((prev) => {
          const updatedConversations = prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  unreadCount: 0,
                  messages: conv.messages.map((msg) => ({
                    ...msg,
                    read: msg.receiverId === userId ? true : msg.read,
                  })),
                }
              : conv
          );
          const totalUnread = updatedConversations.reduce(
            (sum, conv) => sum + (conv.unreadCount || 0),
            0
          );
          console.log("Total de não lidas após leitura:", totalUnread);
          setUnreadMessages(totalUnread);
          return updatedConversations;
        });
      }
    });

    return () => {
      socketManager.off("newMessage");
      socketManager.off("messagesRead");
      socketManager.off("connect");
    };
  }, [userId, conversations]);

  // Sincronizar conversas ao voltar para o FeedScreen
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        console.log("FeedScreen em foco, sincronizando conversas...");
        fetchConversations(userId); // Recarregar conversas para atualizar o estado
      }
    }, [userId])
  );

  const fetchConversations = async (storedUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${SOCKET_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Erro ao buscar conversas:", response.status);
        return;
      }

      const conversationsData: Conversation[] = await response.json();
      console.log("Conversas recebidas:", conversationsData);

      const conversationsWithUnread = conversationsData.map((conv) => ({
        ...conv,
        messages: conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), // Ordem ascendente
        unreadCount: conv.messages.filter((msg) => msg.receiverId === storedUserId && !msg.read).length,
      }));

      setConversations(conversationsWithUnread);
      const totalUnread = conversationsWithUnread.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setUnreadMessages(totalUnread);
      console.log("Total inicial de não lidas:", totalUnread);

      if (socketManager.isConnected()) {
        conversationsWithUnread.forEach((conv) => {
          socketManager.emit("joinConversation", conv.id);
          console.log(`Juntando-se à conversa ${conv.id}`);
        });
      }
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
    }
  };

  console.log("Renderizando FeedScreen com unreadMessages:", unreadMessages);

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <Feed />
      <View style={styles.footerButtons}>
        <NavButton iconName="home-outline" onPress={() => navigation.navigate("Feed")} />
        <NavButton iconName="download-outline" onPress={() => navigation.navigate("FileManager")} />
        {tipoUsuario === "admin" && (
          <NavButton iconName="add-circle-outline" onPress={() => setShowPostForm(true)} />
        )}
        <NavButton iconName="calendar-outline" onPress={() => setShowCalendarModal(true)} />
        <NavButton
          iconName="chatbubble-outline"
          onPress={() => navigation.navigate("DirectMessages")}
          badgeCount={unreadMessages > 0 ? unreadMessages : 0}
        />
      </View>

      {/* Modal para criar postagem */}
      <Modal visible={showPostForm} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowPostForm(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
              style={styles.modalContainer}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <PostForm onClose={() => setShowPostForm(false)} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de calendário */}
      <Modal visible={showCalendarModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowCalendarModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Escolha o Calendário</Text>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarEvents")}>
                <Text style={styles.optionText}>Calendário de Eventos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarHolidays")}>
                <Text style={styles.optionText}>Calendário de Férias</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarBirthdays")}>
                <Text style={styles.optionText}>Calendário de Aniversários</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Text style={styles.closeButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    marginVertical: 10,
  },
  closeButton: {
    color: "#007AFF",
    marginTop: 10,
    textAlign: "center",
  },
});

export default FeedScreen;