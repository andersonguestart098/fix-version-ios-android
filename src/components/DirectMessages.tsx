import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { UserCircle, Search } from "lucide-react-native";
import { socketManager } from "../utils/socketManager";

const SOCKET_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type DirectMessagesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "DirectMessages"
>;

interface User {
  id: string;
  usuario: string;
  avatar?: string;
}

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
  user1: User;
  user2: User;
  unreadCount: number;
}

const DirectMessages: React.FC = () => {
  const navigation = useNavigation<DirectMessagesScreenNavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [filteredList, setFilteredList] = useState<(Conversation | User)[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const currentConversationId = useRef<string | null>(null);

  const initializeSocket = (storedUserId: string) => {
    socketManager.connect(storedUserId);

    socketManager.on("connect", () => {
      console.log("✅ Socket conectado! ID:", socketManager.getSocket()?.id);
      socketManager.emit("userConnected", storedUserId);
      conversations.forEach((conv) => {
        socketManager.emit("joinConversation", conv.id);
        console.log(`📩 Inscrevendo-se na conversa ${conv.id}`);
      });
    });

    socketManager.on("userOnlineStatus", (onlineUserIds: string[]) => {
      console.log("📡 Usuários online atualizados:", onlineUserIds);
      setOnlineUsers(onlineUserIds);
    });

    socketManager.on("newMessage", (message: Message) => {
      console.log("📥 Nova mensagem recebida:", message);
      setConversations((prev) => {
        const updatedConversations = [...prev];
        const convIndex = updatedConversations.findIndex(
          (conv) => conv.id === message.conversationId
        );

        const isForUser = message.receiverId === storedUserId && !message.read;
        const isCurrentConversation = message.conversationId === currentConversationId.current;

        if (convIndex !== -1) {
          const conv = updatedConversations[convIndex];
          const newMessages = [message, ...conv.messages.filter((msg) => msg.id !== message.id)];
          const unreadCount = isCurrentConversation
            ? 0
            : newMessages.filter((msg) => msg.receiverId === storedUserId && !msg.read).length;

          updatedConversations[convIndex] = {
            ...conv,
            messages: newMessages,
            unreadCount,
          };
          console.log(
            `📈 Conversa ${conv.id} atualizada. isCurrent: ${isCurrentConversation}, unreadCount: ${unreadCount}`
          );
        } else if (isForUser) {
          const newConversation: Conversation = {
            id: message.conversationId,
            user1Id: message.senderId,
            user2Id: storedUserId,
            messages: [message],
            user1: { id: message.senderId, usuario: "Desconhecido" },
            user2: { id: storedUserId, usuario: "Eu" },
            unreadCount: isCurrentConversation ? 0 : 1,
          };
          updatedConversations.unshift(newConversation);
          socketManager.emit("joinConversation", message.conversationId);
          console.log(
            `🆕 Nova conversa ${message.conversationId} adicionada. unreadCount: ${newConversation.unreadCount}`
          );
        }

        return updatedConversations.sort((a, b) => {
          const lastMessageA = a.messages[0]?.createdAt || "0";
          const lastMessageB = b.messages[0]?.createdAt || "0";
          return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
        });
      });
    });

    socketManager.on("messagesRead", ({ conversationId, userId: readerId }) => {
      console.log(`📖 Mensagens lidas na conversa ${conversationId} por ${readerId}`);
      if (readerId === storedUserId) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  unreadCount: 0,
                  messages: conv.messages.map((msg) => ({
                    ...msg,
                    read: msg.receiverId === storedUserId ? true : msg.read,
                  })),
                }
              : conv
          )
        );
      }
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const initialize = async () => {
        console.log("🔍 Iniciando DirectMessages...");
        const storedUserId = await AsyncStorage.getItem("userId");
        if (!storedUserId) {
          console.warn("⚠️ Nenhum userId encontrado no AsyncStorage");
          return;
        }

        setUserId(storedUserId);
        console.log("👤 UserId definido:", storedUserId);

        console.log("🔗 Conectando socket global...");
        initializeSocket(storedUserId);

        console.log("🔍 Estado do socket antes de fetch:", socketManager.isConnected() ? "Conectado" : "Desconectado");
        await fetchUsersAndConversations(storedUserId);
        setLoading(false);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();

        console.log("✅ Inicialização concluída");
      };

      initialize();

      return () => {
        console.log("🛑 Cleanup do DirectMessages. Removendo listeners temporariamente.");
        socketManager.off("newMessage");
        socketManager.off("messagesRead");
        socketManager.off("userOnlineStatus");
        socketManager.off("connect");
      };
    }, [])
  );

  useEffect(() => {
    if (!userId) return;

    const updatedFilteredList = searchText.trim()
      ? [
          ...conversations.filter((conv) => {
            const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
            return otherUser.usuario.toLowerCase().includes(searchText.toLowerCase());
          }),
          ...users.filter((user) => user.usuario.toLowerCase().includes(searchText.toLowerCase())),
        ]
      : [...conversations, ...users];

    setFilteredList(updatedFilteredList);
    console.log("📋 FilteredList atualizado:", updatedFilteredList.length);
  }, [conversations, users, searchText, userId]);

  const fetchUsersAndConversations = async (storedUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");

      console.log("📡 Buscando usuários e conversas...");
      const [usersResponse, conversationsResponse] = await Promise.all([
        axios.get(`${SOCKET_URL}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${SOCKET_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const sortedConversations = conversationsResponse.data.sort((a: Conversation, b: Conversation) => {
        const lastMessageA = a.messages[0]?.createdAt || "0";
        const lastMessageB = b.messages[0]?.createdAt || "0";
        return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
      });

      setConversations(sortedConversations);
      const conversationUserIds = sortedConversations.flatMap((conv) => [conv.user1Id, conv.user2Id]);
      const usersWithoutConversation = usersResponse.data.filter(
        (user: User) => user.id !== storedUserId && !conversationUserIds.includes(user.id)
      );

      setUsers(usersWithoutConversation);
      setFilteredList([...sortedConversations, ...usersWithoutConversation]);
      console.log(
        "📡 Dados carregados:",
        sortedConversations.length,
        "conversas,",
        usersWithoutConversation.length,
        "usuários"
      );

      if (socketManager.isConnected()) {
        sortedConversations.forEach((conv) => {
          socketManager.emit("joinConversation", conv.id);
          console.log(`📩 Inscrevendo-se na conversa ${conv.id}`);
        });
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error.message);
    }
  };

  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const openChat = async (selectedUser: User) => {
    if (!userId) return;

    console.log("🚪 Abrindo chat com:", selectedUser.usuario);
    const existingConversation = conversations.find(
      (conv) =>
        (conv.user1Id === userId && conv.user2Id === selectedUser.id) ||
        (conv.user2Id === userId && conv.user1Id === selectedUser.id)
    );

    if (existingConversation) {
      await markMessagesAsRead(existingConversation.id);
      currentConversationId.current = existingConversation.id;
      navigation.navigate("Chat", {
        conversationId: existingConversation.id,
        userId,
        receiverId: selectedUser.id,
      });
    } else {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await axios.post(
          `${SOCKET_URL}/conversations`,
          { user2Id: selectedUser.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const newConversation: Conversation = {
          ...response.data,
          messages: [],
          user1: { id: userId, usuario: "Eu" },
          user2: selectedUser,
          unreadCount: 0,
        };

        setConversations((prev) => [newConversation, ...prev]);
        setFilteredList((prev) => [newConversation, ...prev.filter((item) => (item as User)?.id !== selectedUser.id)]);
        currentConversationId.current = newConversation.id;

        if (socketManager.isConnected()) {
          socketManager.emit("joinConversation", newConversation.id);
        }

        navigation.navigate("Chat", {
          conversationId: newConversation.id,
          userId,
          receiverId: selectedUser.id,
        });
      } catch (error) {
        console.error("❌ Erro ao criar conversa:", error.message);
      }
    }

    navigation.addListener("blur", () => {
      currentConversationId.current = null;
      console.log("🔄 currentConversationId resetado ao sair do Chat");
    });
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !userId) return;

      console.log(`📖 Marcando mensagens como lidas na conversa ${conversationId}`);
      await axios.post(
        `${SOCKET_URL}/conversations/${conversationId}/messages/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setConversations((prev) =>
        prev.map((conv) =>
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
        )
      );

      if (socketManager.isConnected()) {
        socketManager.emit("messagesRead", { conversationId, userId });
        console.log(`📩 Emitido messagesRead para ${conversationId}`);
      }
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensagens Diretas</Text>
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuário..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredList}
            renderItem={({ item }) => {
              const isUser = (item as User).usuario !== undefined;
              const user = isUser
                ? (item as User)
                : (item as Conversation).user1Id === userId
                ? (item as Conversation).user2
                : (item as Conversation).user1;
              const unreadCount = !isUser ? (item as Conversation).unreadCount : 0;
              const lastMessage = !isUser && (item as Conversation).messages.length > 0
                ? (item as Conversation).messages[0].content
                : "Iniciar conversa";

              return (
                <TouchableOpacity style={styles.conversationItem} onPress={() => openChat(user)}>
                  <View style={styles.avatarContainer}>
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                      <UserCircle size={50} color="#A0A0A0" />
                    )}
                    {isUserOnline(user.id) && <View style={styles.onlineIndicator} />}
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.userName}>{user.usuario}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {lastMessage}
                    </Text>
                  </View>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => (item as any).id}
            extraData={conversations}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginVertical: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 12,
    width: 14,
    height: 14,
    backgroundColor: "#03fc3d",
    borderRadius: 7,
  },
  textContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  lastMessage: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default DirectMessages;