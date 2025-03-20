import React, { useState, useEffect, useRef } from "react";
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import io from "socket.io-client";

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
  const socket = useRef<SocketIOClient.Socket | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      const storedUserId = await AsyncStorage.getItem("userId");
      setTipoUsuario(tipo);

      if (storedUserId) {
        setUserId(storedUserId);
        await fetchConversations(storedUserId);
      }
    };

    initialize();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Inicializa o socket após o userId ser definido
    socket.current = io(SOCKET_URL, { query: { userId } });

    socket.current.on("connect", () => {
      console.log("Socket conectado no FeedScreen:", socket.current?.id);
      // Inscreve o usuário em todas as salas de conversas
      conversations.forEach((conv) => {
        socket.current?.emit("joinConversation", conv.id);
        console.log(`Usuário ${userId} entrou na conversa ${conv.id}`);
      });
    });

    socket.current.on("newMessage", (message: Message) => {
      console.log("📥 Nova mensagem recebida no FeedScreen:", message);
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            const isNewMessageForUser = message.receiverId === userId && !message.read;
            return {
              ...conv,
              messages: [message, ...conv.messages], // Adiciona a nova mensagem no início
              unreadCount: isNewMessageForUser ? conv.unreadCount + 1 : conv.unreadCount,
            };
          }
          return conv;
        });

        // Calcula o total de mensagens não lidas
        const totalUnread = updatedConversations.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0
        );
        setUnreadMessages(totalUnread);
        console.log("✅ Total de mensagens não lidas atualizado:", totalUnread);

        return updatedConversations;
      });
    });

    socket.current.on("messagesRead", ({ conversationId, userId: readerId }) => {
      console.log(`📖 Mensagens marcadas como lidas na conversa ${conversationId} por ${readerId}`);
      if (readerId === userId) {
        setConversations((prev) => {
          const updatedConversations = prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  unreadCount: 0, // Zera o contador de mensagens não lidas
                  messages: conv.messages.map((msg) => ({
                    ...msg,
                    read: msg.receiverId === userId ? true : msg.read,
                  })),
                }
              : conv
          );

          // Calcula o novo total de mensagens não lidas
          const totalUnread = updatedConversations.reduce(
            (sum, conv) => sum + (conv.unreadCount || 0),
            0
          );
          setUnreadMessages(totalUnread);
          console.log("✅ Total de mensagens não lidas atualizado após leitura:", totalUnread);

          return updatedConversations;
        });
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [userId, conversations]);

  const fetchConversations = async (storedUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      console.log("📡 Buscando conversas...");
      const response = await fetch(`${SOCKET_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro na resposta do servidor: ${response.status} - ${errorText}`);
        return;
      }

      const conversationsData: Conversation[] = await response.json();
      console.log("📋 Conversas recebidas:", conversationsData);

      // Calcula unreadCount inicial baseado nas mensagens
      const conversationsWithUnread = conversationsData.map((conv) => ({
        ...conv,
        unreadCount: conv.messages.filter((msg) => msg.receiverId === storedUserId && !msg.read).length,
      }));

      setConversations(conversationsWithUnread);
      const totalUnread = conversationsWithUnread.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setUnreadMessages(totalUnread);
      console.log("✅ Total de mensagens não lidas inicial:", totalUnread);
    } catch (error) {
      console.error("❌ Erro ao buscar conversas:", error.message);
    }
  };

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
          badgeCount={unreadMessages}
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