import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import Navbar from "../components/NavBar";
import Feed from "../components/Feed";
import PostForm from "../components/PostForm";
import NavButton from "../components/botoesNav";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import io from "socket.io-client";

const SOCKET_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  id: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  receiverId: string;
  read: boolean;
}

const FeedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const socket = useRef<SocketIOClient.Socket | null>(null);
  const isFocused = useIsFocused();

  const fetchInitialUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!token || !userId) {
        console.error("❌ Token ou userId não encontrados:", { token, userId });
        return;
      }

      console.log("🔍 Buscando contagem inicial de mensagens não lidas...");
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

      const conversations: Conversation[] = await response.json();
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      console.log("✅ Contagem inicial de mensagens não lidas:", totalUnread);
      setUnreadMessages(totalUnread);
    } catch (error) {
      console.error("❌ Erro ao buscar contagem inicial:", error.message);
    }
  };

  useEffect(() => {
    const fetchTipoUsuario = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      console.log("📋 Tipo de usuário obtido:", tipo);
      setTipoUsuario(tipo);
    };
    fetchTipoUsuario();

    const initializeSocket = async () => {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      if (!userId || !token) {
        console.error("❌ Usuário não autenticado ou token não encontrado");
        return;
      }

      console.log("👤 Conectando socket para userId:", userId);
      socket.current = io(SOCKET_URL, {
        path: "/socket.io",
        query: { userId },
        auth: { token },
        transports: ["websocket"],
      });

      socket.current.on("connect", () => {
        console.log("✅ Socket conectado com sucesso no FeedScreen!");
      });

      socket.current.on("connect_error", (error) => {
        console.error("❌ Erro ao conectar socket:", error.message);
      });

      socket.current.on("newMessage", (message: Message) => {
        console.log("📥 Nova mensagem recebida via socket:", message);
        if (message.receiverId === userId && !message.read) {
          setUnreadMessages((prev) => {
            const newCount = prev + 1;
            console.log("📈 Contagem de mensagens não lidas atualizada para:", newCount);
            return newCount;
          });
        } else {
          console.log("📩 Mensagem ignorada (não é para este usuário ou já lida):", {
            receiverId: message.receiverId,
            userId,
            read: message.read,
          });
        }
      });

      socket.current.on("messagesRead", ({ conversationId, userId: readerId }) => {
        console.log(`📖 Mensagens lidas na conversa ${conversationId} por ${readerId}`);
        if (readerId === userId) {
          fetchInitialUnreadCount();
        }
      });

      fetchInitialUnreadCount();

      return () => {
        if (socket.current) {
          console.log("🔌 Desconectando socket do FeedScreen...");
          socket.current.disconnect();
        }
      };
    };

    initializeSocket();

    return () => {
      if (socket.current) {
        socket.current.off("connect");
        socket.current.off("connect_error");
        socket.current.off("newMessage");
        socket.current.off("messagesRead");
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      console.log("🔄 Tela FeedScreen em foco, atualizando contagem...");
      fetchInitialUnreadCount();
    }
  }, [isFocused]);

  const openChat = async () => {
    console.log("🗣️ Navegando para DirectMessages");
    navigation.navigate("DirectMessages");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <Feed />
      <View style={styles.footerButtons}>
        <NavButton iconName="download-outline" onPress={() => navigation.navigate("FileManager")} />
        {tipoUsuario === "admin" && (
          <NavButton iconName="add-circle-outline" onPress={() => setShowPostForm(true)} />
        )}
        <NavButton iconName="calendar-outline" onPress={() => setShowCalendarModal(true)} />
        <NavButton
          iconName="chatbubble-outline"
          onPress={openChat}
          badgeCount={unreadMessages}
        />
      </View>

      <Modal visible={showPostForm} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={() => setShowPostForm(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <PostForm onClose={() => setShowPostForm(false)} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showCalendarModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={() => setShowCalendarModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text>Calendário ainda não implementado</Text>
                <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                  <Text style={styles.closeButton}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
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
    height: 65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxHeight: "80%",
  },
  closeButton: {
    color: "#007AFF",
    marginTop: 10,
    textAlign: "center",
  },
});

export default FeedScreen;