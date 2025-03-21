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
  Keyboard,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SendHorizontal, Paperclip } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { socketManager } from "../utils/socketManager";
import * as FileSystem from "expo-file-system"; // Adicionar para manipular arquivos

type RootStackParamList = {
  Chat: { conversationId: string; userId: string; receiverId: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

interface ChatProps {
  route: ChatScreenRouteProp;
  navigation: ChatScreenNavigationProp;
}

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
  fileUrl?: string;
  filename?: string;
  mimetype?: string;
  read: boolean;
  createdAt: string;
  sender: User;
  receiver: User;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
  currentPage: number;
  hasMore: boolean;
}

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

const Chat: React.FC<ChatProps> = ({ route, navigation }) => {
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const soundObjectRef = useRef<Audio.Sound | null>(null);
  const limit = 20;

  // Carregar som de notificação
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/750609__deadrobotmusic__notification-sound-3.wav")
        );
        soundObjectRef.current = sound;
        console.log("✅ Som carregado com sucesso");
      } catch (error) {
        console.error("❌ Erro ao carregar som:", error);
      }
    };
    loadSound();

    return () => {
      if (soundObjectRef.current) {
        soundObjectRef.current.unloadAsync();
        console.log("🔇 Som descarregado");
      }
    };
  }, []);

  // Inicializar socket e carregar mensagens
  useEffect(() => {
    if (!conversationId || !userId) {
      console.warn("⚠️ Parâmetros inválidos:", { conversationId, userId });
      return;
    }

    const initializeSocket = async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      if (!storedUserId) {
        console.warn("⚠️ Nenhum userId encontrado no AsyncStorage");
        return;
      }

      if (!socketManager.isConnected()) {
        socketManager.connect(storedUserId);
        console.log("🔌 Socket reconectado no Chat para userId:", storedUserId);
      }

      socketManager.emit("joinConversation", conversationId);
      console.log("📩 Entrou na conversa:", conversationId);

      socketManager.on("newMessage", (message: Message) => {
        console.log("📬 Nova mensagem recebida no Chat:", message);
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === message.id)) {
            console.log("⚠️ Mensagem duplicada ignorada:", message.id);
            return prev;
          }
          const updatedMessages = [message, ...prev];
          if (message.receiverId === userId && !message.read) {
            playNotificationSound();
            markMessagesAsRead();
          }
          return updatedMessages;
        });
        scrollToBottom();
      });

      socketManager.on("messagesRead", ({ conversationId: convId, userId: readerId }) => {
        if (convId === conversationId && readerId === userId) {
          console.log("📖 Mensagens marcadas como lidas localmente");
          setMessages((prev) =>
            prev.map((msg) => ({
              ...msg,
              read: msg.receiverId === userId ? true : msg.read,
            }))
          );
        }
      });
    };

    initializeSocket();
    fetchMessages(true);

    return () => {
      console.log("🛑 Saindo do Chat. Limpando listeners locais.");
      socketManager.off("newMessage");
      socketManager.off("messagesRead");
    };
  }, [conversationId, userId]);

  const playNotificationSound = async () => {
    if (soundObjectRef.current) {
      try {
        await soundObjectRef.current.replayAsync();
        console.log("✅ Som de notificação tocado");
      } catch (error) {
        console.error("❌ Erro ao tocar som:", error);
      }
    }
  };

  const fetchMessages = useCallback(
    async (initialLoad = false) => {
      if (isLoadingMore && !initialLoad) return;

      setIsLoadingMore(true);
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await fetch(
          `${BASE_URL}/conversations/${conversationId}/messages?page=${initialLoad ? 1 : page + 1}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Erro ao carregar mensagens");
        const data: MessagesResponse = await response.json();
        console.log(`✅ Mensagens recebidas: ${data.messages.length}, HasMore: ${data.hasMore}`);

        if (initialLoad) {
          setMessages(data.messages);
          if (data.messages.some((msg) => msg.receiverId === userId && !msg.read)) {
            markMessagesAsRead();
          }
          setTimeout(scrollToBottom, 100);
        } else {
          setMessages((prev) => [...prev, ...data.messages.filter((msg) => !prev.some((m) => m.id === msg.id))]);
        }

        setPage(initialLoad ? 1 : page + 1);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error("❌ Erro ao buscar mensagens:", error);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    },
    [conversationId, page, isLoadingMore]
  );

  const markMessagesAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await fetch(`${BASE_URL}/conversations/${conversationId}/messages/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      socketManager.emit("messagesRead", { conversationId, userId });
      console.log("📩 Emitido messagesRead");
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageData = { conversationId, senderId: userId, receiverId, content: newMessage };

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      ...messageData,
      createdAt: new Date().toISOString(),
      read: false,
      sender: { id: userId, usuario: "Eu", avatar: null },
      receiver: { id: receiverId, usuario: "Outro", avatar: null },
    };
    setMessages((prev) => [tempMessage, ...prev]);
    scrollToBottom();

    socketManager.emit("sendMessage", messageData);
    console.log("📤 Mensagem enviada:", messageData);

    setNewMessage("");
    Keyboard.dismiss();
    setIsSending(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) fetchMessages(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled) {
        const file = result.assets[0];
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name || "uploaded_file",
          type: file.mimeType || "application/octet-stream",
        } as any);
        formData.append("conversationId", conversationId);
        formData.append("senderId", userId);
        formData.append("receiverId", receiverId);

        setUploading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await axios.post(`${BASE_URL}/files/uploadChat`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        console.log("✅ Upload concluído:", response.data);
        Alert.alert("Sucesso", "Arquivo enviado!");
      }
    } catch (error) {
      console.error("❌ Erro no upload:", error);
      Alert.alert("Erro", "Falha ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      const relativePath = fileUrl.startsWith("http")
        ? fileUrl.split("/files/")[1] || fileUrl.split("/").pop() // Pega o ID do arquivo
        : fileUrl;
      const fullUrl = `${BASE_URL}/files/${relativePath}`;
  
      // Abrir a URL diretamente com Linking
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
        console.log("✅ Download iniciado:", fullUrl);
      } else {
        throw new Error("Não é possível abrir a URL");
      }
    } catch (error) {
      console.error("❌ Erro no download:", error);
      Alert.alert("Erro", "Falha ao iniciar o download. Verifique sua conexão.");
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const checkColor = item.read ? "#00AEEF" : "#64748b";
    const hasAttachment = item.content?.startsWith("Arquivo enviado:");
    const filename = hasAttachment ? item.content.replace("Arquivo enviado: ", "") : item.filename || "Arquivo";
    const fileUrl = item.fileUrl || `${conversationId}/${item.id}`;

    return (
      <TouchableOpacity
        style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}
        onPress={hasAttachment ? () => handleDownload(fileUrl, filename) : undefined}
      >
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          <BlurView intensity={isMyMessage ? 40 : 60} tint={isMyMessage ? "default" : "light"} style={styles.messageBlur}>
            {hasAttachment ? (
              <>
                <Ionicons name="document-text" size={20} color="#00AEEF" style={styles.fileIcon} />
                <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                  {filename} (Anexo)
                </Text>
              </>
            ) : (
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                {item.content}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
                {messageTime}
              </Text>
              {isMyMessage && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark-done" size={16} color={checkColor} />
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#00AEEF" />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 25}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#00AEEF" style={styles.loader} />
      ) : (
        <Animated.View style={[styles.chatContainer, { opacity: fadeAnim }]}>
          <FlatList
            inverted
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
            ListFooterComponent={renderFooter}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Paperclip size={24} color="#FFF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              <SendHorizontal size={28} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  chatContainer: { flex: 1 },
  messagesList: { paddingVertical: 20, paddingBottom: 10 },
  messageWrapper: { paddingHorizontal: 16, marginVertical: 4 },
  myMessageWrapper: { alignItems: "flex-end" },
  otherMessageWrapper: { alignItems: "flex-start" },
  messageContainer: { maxWidth: "85%", borderRadius: 24, overflow: "hidden" },
  messageBlur: { padding: 16 },
  myMessage: { backgroundColor: "rgba(0, 174, 239, 0.15)" },
  otherMessage: { backgroundColor: "rgba(255, 255, 255, 0.9)", borderWidth: 1, borderColor: "rgba(226, 232, 240, 0.6)" },
  messageText: { fontSize: 16, lineHeight: 24 },
  myMessageText: { color: "#1e293b" },
  otherMessageText: { color: "#334155" },
  messageTime: { fontSize: 12, marginTop: 4 },
  myMessageTime: { color: "#00AEEF", alignSelf: "flex-end" },
  otherMessageTime: { color: "#64748b", alignSelf: "flex-start" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  input: { flex: 1, minHeight: 48, maxHeight: 120, backgroundColor: "#f1f5f9", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginRight: 12, fontSize: 16, color: "#0f172a" },
  sendButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#00AEEF", justifyContent: "center", alignItems: "center", alignSelf: "flex-end", shadowColor: "#00AEEF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 6 },
  sendButtonDisabled: { backgroundColor: "#e2e8f0", shadowOpacity: 0 },
  uploadButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#00AEEF", justifyContent: "center", alignItems: "center", marginRight: 12, shadowColor: "#00AEEF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 6 },
  uploadButtonDisabled: { backgroundColor: "#e2e8f0", shadowOpacity: 0 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fef2f2", padding: 20 },
  errorText: { color: "#991b1b", fontSize: 16, textAlign: "center" },
  checkIcon: { marginLeft: 5 },
  messageFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4 },
  fileIcon: { marginBottom: 8 },
  loader: { paddingVertical: 10, alignItems: "center" },
});

export default Chat;