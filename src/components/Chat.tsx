import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SendHorizontal as SendHorizonal } from "lucide-react-native";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";

const SOCKET_URL = "http://192.168.0.61:3001"; // Certifique-se de que a URL está correta

interface User {
  id: string;
  usuario: string;
  avatar: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: User;
  receiver: User;
}

const Chat = ({ route }) => {
  if (!route.params) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid navigation parameters</Text>
      </View>
    );
  }

  const { conversationId, userId, receiverId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const newSocket = io(SOCKET_URL, { query: { userId } });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket conectado!");
      newSocket.emit("joinConversation", conversationId);
    });

    newSocket.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      scrollToBottom();
    });

    fetchMessages();

    return () => {
      newSocket.disconnect();
    };
  }, [conversationId, userId]);

  const fetchMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${SOCKET_URL}/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        setMessages(data.reverse());
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      conversationId,
      senderId: userId,
      receiverId,
      content: newMessage,
    };

    socket.emit("sendMessage", messageData);
    setNewMessage("");
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (!item || !item.content || !item.createdAt) return null;

    const isMyMessage = item.senderId === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <BlurView
            intensity={isMyMessage ? 40 : 60}
            tint={isMyMessage ? "default" : "light"}
            style={styles.messageBlur}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
              ]}
            >
              {messageTime}
            </Text>
          </BlurView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#00AEEF" />
      ) : (
        <Animated.View style={[styles.chatContainer, { opacity: fadeAnim }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <SendHorizonal
                size={28}
                color={newMessage.trim() ? "#ffffff" : "#94a3b8"}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 20,
  },
  messageWrapper: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  myMessageWrapper: {
    alignItems: "flex-end",
  },
  otherMessageWrapper: {
    alignItems: "flex-start",
  },
  messageContainer: {
    maxWidth: "85%",
    borderRadius: 24,
    overflow: "hidden",
  },
  messageBlur: {
    padding: 16,
  },
  myMessage: {
    backgroundColor: "rgba(0, 174, 239, 0.15)",
  },
  otherMessage: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  myMessageText: {
    color: "#1e293b",
  },
  otherMessageText: {
    color: "#334155",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: "#00AEEF",
    alignSelf: "flex-end",
  },
  otherMessageTime: {
    color: "#64748b",
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#f1f5f9",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00AEEF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    shadowColor: "#00AEEF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#e2e8f0",
    shadowOpacity: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 20,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 16,
    textAlign: "center",
  },
});

export default Chat;