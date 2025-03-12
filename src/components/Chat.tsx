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
  Keyboard,
} from "react-native";
import { SendHorizontal as SendHorizonal, Check, CheckCheck } from "lucide-react-native";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import LottieView from "lottie-react-native";
import typingAnimation from "../../assets/Animation - 1740572169179.json";

const SOCKET_URL = "http://192.168.0.61:3001";

const Chat = ({ route }) => {
  if (!route.params) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid navigation parameters</Text>
      </View>
    );
  }

  const { conversationId, userId, receiverId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const socket = useRef(null); // ✅ Agora o socket é armazenado corretamente
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    // ✅ Criando o socket
    socket.current = io(SOCKET_URL, { query: { userId } });

    socket.current.on("connect", () => {
      console.log("✅ Socket conectado!");
      socket.current.emit("joinConversation", conversationId);
    });

    socket.current.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      scrollToBottom();
    });

    socket.current.on("typing", ({ typing }) => {
      setIsTyping(typing);
    });

    // ✅ Receber evento de mensagens lidas em tempo real
    socket.current.on("messagesRead", ({ conversationId: convId, userId: readerId }) => {
      if (convId === conversationId && readerId === receiverId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => ({ ...msg, read: true }))
        );
      }
    });

    fetchMessages();

    return () => {
      socket.current.disconnect();
    };
  }, [conversationId, userId]);

  const fetchMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${SOCKET_URL}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }

      if (data.some((msg) => msg.receiverId === userId && !msg.read)) {
        markMessagesAsRead();
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

  const markMessagesAsRead = async () => {
    if (!socket.current) {
      console.warn("⚠️ Socket ainda não está pronto para emitir eventos.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await fetch(`${SOCKET_URL}/conversations/${conversationId}/messages/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      console.log("✅ Mensagens marcadas como lidas");
      socket.current.emit("messagesRead", { conversationId, userId });

      setMessages((prevMessages) =>
        prevMessages.map((msg) => ({ ...msg, read: true }))
      );
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket.current) return;

    const messageData = {
      conversationId,
      senderId: userId,
      receiverId,
      content: newMessage,
    };

    socket.current.emit("sendMessage", messageData);
    setNewMessage("");

    socket.current.emit("typing", { conversationId, typing: false });
    Keyboard.dismiss();
  };

  const renderMessage = ({ item }) => {
    if (!item || !item.content || !item.createdAt) return null;

    const isMyMessage = item.senderId === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const checkColor = item.read ? "#00AEEF" : "#64748b";

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
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                ]}
              >
                {messageTime}
              </Text>
              {isMyMessage && (
                <View style={styles.checkIcon}>
                  <CheckCheck size={16} color={checkColor} />
                </View>
              )}
            </View>
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
            onContentSizeChange={scrollToBottom}
          />
          {isTyping && (
            <View style={styles.typingContainer}>
              <LottieView
                source={typingAnimation}
                autoPlay
                loop
                style={styles.typingAnimation}
              />
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              onFocus={() => socket.current.emit("typing", { conversationId, typing: true })}
              onBlur={() => socket.current.emit("typing", { conversationId, typing: false })}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <SendHorizonal size={28} color="white" strokeWidth={2.5} />
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
  checkIcon: {
    marginLeft: 5,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingAnimation: {
    width: 50,
    height: 30,
  },
});

export default Chat;