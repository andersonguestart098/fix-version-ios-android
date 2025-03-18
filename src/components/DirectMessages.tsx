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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { UserCircle, Search, Circle } from "lucide-react-native";
import io from "socket.io-client";

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
  const socket = useRef<SocketIOClient.Socket | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      if (storedUserId) {
        setUserId(storedUserId);
        await fetchUsersAndConversations(storedUserId);
      }
      setLoading(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    fetchUserData();

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
      console.log("Socket conectado no DirectMessages:", socket.current?.id);

      // Inscreve o usuário em todas as salas de conversas
      conversations.forEach((conv) => {
        socket.current?.emit("joinConversation", conv.id);
        console.log(`Usuário ${userId} entrou na conversa ${conv.id}`);
      });
    });

    socket.current.on("userOnlineStatus", (onlineUserIds) => {
      console.log("📡 Usuários online atualizados:", onlineUserIds);
      setOnlineUsers(onlineUserIds);
    });

    socket.current.on("newMessage", (message: Message) => {
      console.log("📥 Nova mensagem recebida no DirectMessages:", message);
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

        // Reordena as conversas para colocar a mais recente no topo
        return updatedConversations.sort((a, b) => {
          const lastMessageA = a.messages.length ? new Date(a.messages[0].createdAt).getTime() : 0;
          const lastMessageB = b.messages.length ? new Date(b.messages[0].createdAt).getTime() : 0;
          return lastMessageB - lastMessageA;
        });
      });
    });

    socket.current.on("messagesRead", ({ conversationId, userId: readerId }) => {
      console.log(`📖 Mensagens marcadas como lidas na conversa ${conversationId} por ${readerId}`);
      if (readerId === userId) {
        setConversations((prev) =>
          prev.map((conv) =>
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
          )
        );
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [userId, conversations]);

  const fetchUsersAndConversations = async (storedUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      console.log("📡 Buscando conversas...");
      const [usersResponse, conversationsResponse] = await Promise.all([
        axios.get(`${SOCKET_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${SOCKET_URL}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Ordenar conversas pela última mensagem mais recente
      const sortedConversations = conversationsResponse.data.sort((a: Conversation, b: Conversation) => {
        const lastMessageA = a.messages.length ? new Date(a.messages[0].createdAt).getTime() : 0;
        const lastMessageB = b.messages.length ? new Date(b.messages[0].createdAt).getTime() : 0;
        return lastMessageB - lastMessageA;
      });

      setConversations(sortedConversations);

      // Filtrar usuários que ainda não têm conversa
      const conversationUserIds = sortedConversations.flatMap((conv) => [conv.user1Id, conv.user2Id]);
      const usersWithoutConversation = usersResponse.data.filter(
        (user: User) => user.id !== storedUserId && !conversationUserIds.includes(user.id)
      );

      setUsers(usersWithoutConversation);

      // Atualizar a lista de exibição
      setFilteredList([...sortedConversations, ...usersWithoutConversation]);
    } catch (error) {
      console.error("❌ Erro ao buscar dados:", error);
    }
  };

  // 🔍 Filtragem de busca
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredList([...conversations, ...users]);
      return;
    }

    const lowerText = searchText.toLowerCase();

    const filteredConversations = conversations.filter((conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      return otherUser.usuario.toLowerCase().includes(lowerText);
    });

    const filteredUsers = users.filter((user) => user.usuario.toLowerCase().includes(lowerText));

    setFilteredList([...filteredConversations, ...filteredUsers]);
  }, [searchText, conversations, users]);

  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const openChat = async (selectedUser: User) => {
    if (!userId) return;
  
    const existingConversation = conversations.find(
      (conv) =>
        (conv.user1Id === userId && conv.user2Id === selectedUser.id) ||
        (conv.user2Id === userId && conv.user1Id === selectedUser.id)
    );
  
    if (existingConversation) {
      // ✅ Marcar mensagens como lidas antes de navegar
      await markMessagesAsRead(existingConversation.id);
  
      navigation.navigate("Chat", {
        conversationId: existingConversation.id,
        userId,
        receiverId: selectedUser.id,
      });
    } else {
      console.log(`🆕 Criando nova conversa com ${selectedUser.usuario}...`);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
  
        const response = await axios.post(
          `${SOCKET_URL}/conversations`,
          { user2Id: selectedUser.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        const newConversation: Conversation = {
          ...response.data,
          messages: [],
          user1: users.find((u) => u.id === userId) || { id: userId, usuario: "Eu" },
          user2: selectedUser,
          unreadCount: 0,
        };
  
        setConversations((prev) => [newConversation, ...prev]);
        setFilteredList((prev) => [newConversation, ...prev.filter((item) => (item as User).id !== selectedUser.id)]);
  
        if (socket.current) {
          socket.current.emit("joinConversation", newConversation.id);
          console.log(`Usuário ${userId} entrou na nova conversa ${newConversation.id}`);
        }
  
        navigation.navigate("Chat", {
          conversationId: response.data.id,
          userId,
          receiverId: selectedUser.id,
        });
      } catch (error) {
        console.error("❌ Erro ao criar conversa:", error);
      }
    }
  };

  const fetchInitialUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!token || !userId) {
        console.error("❌ Token ou userId não encontrados:", { token, userId });
        return;
      }
  
      console.log("🔍 Buscando conversas para contar mensagens não lidas...");
  
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
      console.log("📋 Conversas recebidas:", conversations);
  
      const totalUnread = conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0), // Garante que `unreadCount` tenha um valor válido
        0
      );
  
      console.log("✅ Total de mensagens não lidas calculado:", totalUnread);
    } catch (error) {
      console.error("❌ Erro ao buscar contagem inicial de mensagens não lidas:", error.message);
    }
  };
  
  
  // ✅ Função para marcar mensagens como lidas no backend
  const markMessagesAsRead = async (conversationId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
  
      await axios.post(
        `${SOCKET_URL}/conversations/${conversationId}/messages/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      console.log(`📖 Mensagens da conversa ${conversationId} marcadas como lidas.`);
  
      // Atualiza a lista de conversas, zerando unreadCount da conversa aberta
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
  
      // Emite o evento para o socket
      if (socket.current) {
        socket.current.emit("messagesRead", { conversationId, userId });
      }
  
      // Atualiza o contador global de mensagens não lidas no FeedScreen
      fetchInitialUnreadCount();
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error);
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

            return (
              <TouchableOpacity style={styles.conversationItem} onPress={() => openChat(user)}>
                <View style={styles.avatarContainer}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  ) : (
                    <UserCircle size={50} color="#A0A0A0" />
                  )}
                  {isUserOnline(user.id) && <Circle size={14} color="#32CD32" style={styles.onlineIndicator} />}
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.userName}>{user.usuario}</Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {!isUser && (item as Conversation).messages.length > 0
                      ? (item as Conversation).messages[0].content
                      : "Iniciar conversa"}
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
        />
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
    borderWidth: 2,
    borderColor: "#f8fafc",
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