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

const SOCKET_URL = "http://192.168.0.61:3001";

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
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  messages: Message[];
  user1: User;
  user2: User;
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
  const socket = useRef(null);

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

    // 🔥 Conectar ao Socket.IO e ouvir eventos de usuários online
    socket.current = io(SOCKET_URL, { query: { userId } });

    socket.current.on("userOnlineStatus", (onlineUserIds) => {
      setOnlineUsers(onlineUserIds);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

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

            return (
              <TouchableOpacity style={styles.conversationItem} onPress={() => openChat(user)}>
                <View>
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
                    {!isUser && (item as Conversation).messages.length > 0 ? (item as Conversation).messages[0].content : "Iniciar conversa"}
                  </Text>
                </View>
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
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e293b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
  },
  textContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  lastMessage: {
    fontSize: 14,
    color: "#64748b",
  },
  newChatMessage: {
    fontStyle: "italic",
    color: "#007AFF",
  },
});

export default DirectMessages;
