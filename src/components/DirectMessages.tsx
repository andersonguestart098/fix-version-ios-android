import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
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
import { UserCircle } from "lucide-react-native"; // Ícone de avatar genérico

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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      if (storedUserId) {
        setUserId(storedUserId);
        await Promise.all([fetchConversations(storedUserId), fetchUsers()]);
      }
      setLoading(false);

      // Ativar fade-in apenas quando os dados carregam
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    fetchUserData();
  }, []);

  const fetchConversations = async (storedUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      console.log("📡 Buscando conversas...");
      const response = await axios.get("http://192.168.0.61:3001/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📩 Conversas recebidas:", JSON.stringify(response.data, null, 2));
      setConversations(response.data);
    } catch (error) {
      console.error("❌ Erro ao buscar conversas:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      console.log("📡 Buscando usuários...");
      const response = await axios.get("http://192.168.0.61:3001/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("👥 Usuários disponíveis:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("❌ Erro ao buscar usuários:", error);
    }
  };

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
          "http://192.168.0.61:3001/conversations",
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
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Animated.FlatList
          style={{ opacity: fadeAnim }}
          data={users.filter((user) => user.id !== userId)}
          renderItem={({ item }) => {
            const conversation = conversations.find(
              (conv) =>
                (conv.user1Id === userId && conv.user2Id === item.id) ||
                (conv.user2Id === userId && conv.user1Id === item.id)
            );
            const lastMessage = conversation?.messages.length
              ? conversation.messages[conversation.messages.length - 1].content
              : "Iniciar conversa";

            return (
              <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => openChat(item)}
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <UserCircle size={50} color="#A0A0A0" />
                )}
                <View style={styles.textContainer}>
                  <Text style={styles.userName}>{item.usuario}</Text>
                  <Text
                    style={[
                      styles.lastMessage,
                      lastMessage === "Iniciar conversa" && styles.newChatMessage,
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
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
