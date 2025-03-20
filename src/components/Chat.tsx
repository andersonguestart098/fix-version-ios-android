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
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SendHorizontal, Paperclip, Download } from "lucide-react-native";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

// Tipagem para as props do componente Chat usando React Navigation
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Definir o tipo das rotas da navegação
type RootStackParamList = {
  Chat: {
    conversationId: string;
    userId: string;
    receiverId: string;
  };
};

// Tipagem para as props do componente Chat
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

const Chat: React.FC<ChatProps> = ({ route }) => {
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
  const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const soundObjectRef = useRef<Audio.Sound | null>(null);
  const limit = 20;

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/750609__deadrobotmusic__notification-sound-3.wav")
        );
        soundObjectRef.current = sound;
        console.log("Som carregado com sucesso usando expo-av");
      } catch (error) {
        console.error("Erro ao carregar o som com expo-av:", error);
      }
    };

    loadSound();

    return () => {
      if (soundObjectRef.current) {
        soundObjectRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      console.warn("⚠️ conversationId ou userId não fornecidos:", { conversationId, userId });
      return;
    }

    console.log("🔌 Inicializando conexão com o socket...");
    const newSocket = io("https://cemear-b549eb196d7c.herokuapp.com", {
      path: "/socket.io",
      query: { userId },
      transports: ["websocket"],
      reconnection: true, // Habilita reconexão automática
      reconnectionAttempts: 5, // Número de tentativas de reconexão
      reconnectionDelay: 1000, // Tempo entre tentativas de reconexão (ms)
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket conectado com sucesso! ID:", newSocket.id);
      console.log("📩 Entrando na conversa:", conversationId);
      newSocket.emit("joinConversation", conversationId);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Erro ao conectar ao socket:", error.message);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket desconectado:", reason);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log("🔄 Socket reconectado após", attempt, "tentativas");
      newSocket.emit("joinConversation", conversationId);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Falha ao reconectar ao socket após todas as tentativas");
    });

    newSocket.on("newMessage", (message: Message) => {
      console.log("📬 Evento newMessage recebido:", message);

      setMessages((prevMessages) => {
        // Verifica se a mensagem já existe pelo ID oficial
        const exists = prevMessages.some((msg) => msg.id === message.id);
        if (exists) {
          console.log("⚠️ Mensagem já existe, ignorando:", message.id);
          return prevMessages; // Evita adicionar duplicatas
        }

        // Adiciona a nova mensagem no topo (mais recente)
        console.log("✅ Adicionando nova mensagem:", message.id);
        const updatedMessages = [message, ...prevMessages];
        if (message.senderId !== userId) {
          playNotificationSound();
        }
        return updatedMessages;
      });

      // Rola para o topo (mensagem mais recente) quando uma nova mensagem chega
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });

    newSocket.on("messagesRead", ({ conversationId: convId, userId: readerId }) => {
      console.log("📖 Evento messagesRead recebido:", { convId, readerId });
      if (convId === conversationId && readerId === receiverId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => ({ ...msg, read: true }))
        );
      }
    });

    newSocket.on("error", (error) => {
      console.error("❌ Erro recebido do socket:", error);
      Alert.alert("Erro", error.message || "Ocorreu um erro no servidor.");
    });

    fetchMessages(true);

    return () => {
      console.log("🔌 Desconectando socket...");
      newSocket.disconnect();
    };
  }, [conversationId, userId]);

  const playNotificationSound = async () => {
    if (soundObjectRef.current) {
      try {
        await soundObjectRef.current.replayAsync();
        console.log("✅ Som de notificação tocado com sucesso");
      } catch (error) {
        console.error("❌ Erro ao tocar o som:", error);
      }
    } else {
      console.log("⚠️ Som não carregado ainda");
    }
  };

  const firstLoad = useRef(true);

  const fetchMessages = useCallback(
    async (initialLoad = false) => {
      if (isLoadingMore && !initialLoad) return;

      setIsLoadingMore(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("Token de autenticação não encontrado");
        }

        const fetchPage = initialLoad ? 1 : page + 1;
        console.log(`📥 Buscando mensagens - Página ${fetchPage}, Limite ${limit}`);

        const response = await fetch(
          `https://cemear-b549eb196d7c.herokuapp.com/conversations/${conversationId}/messages?page=${fetchPage}&limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Falha ao carregar mensagens");
        }

        const data = await response.json();
        console.log(`✅ Mensagens recebidas - Total: ${data.messages.length}, HasMore: ${data.hasMore}`);

        if (initialLoad) {
          // Carrega as mensagens iniciais (primeira página)
          setMessages(data.messages);
          if (firstLoad.current) {
            setTimeout(() => {
              scrollToBottom();
            }, 100);
            firstLoad.current = false;
          }
        } else {
          // Adiciona mensagens mais antigas ao final da lista
          setMessages((prevMessages) => {
            // Filtra mensagens duplicadas com base no ID
            const newMessages = data.messages.filter(
              (newMsg: Message) => !prevMessages.some((msg) => msg.id === newMsg.id)
            );
            return [...prevMessages, ...newMessages];
          });
        }

        setPage(fetchPage);
        setHasMore(data.hasMore);

        if (data.messages.some((msg) => msg.receiverId === userId && !msg.read)) {
          markMessagesAsRead();
        }
      } catch (error) {
        console.error("❌ Erro ao buscar mensagens:", error.message);
        Alert.alert("Erro", "Não foi possível carregar as mensagens.");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    },
    [conversationId, page, isLoadingMore, limit]
  );

  const markMessagesAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("⚠️ Token de autenticação não encontrado");
        return;
      }

      console.log("📖 Marcando mensagens como lidas...");
      await fetch(
        `https://cemear-b549eb196d7c.herokuapp.com/conversations/${conversationId}/messages/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );

      if (socket) {
        console.log("📩 Emitindo evento messagesRead:", { conversationId, userId });
        socket.emit("messagesRead", { conversationId, userId });
      }

      setMessages((prevMessages) =>
        prevMessages.map((msg) => ({ ...msg, read: true }))
      );
      console.log("✅ Mensagens marcadas como lidas localmente");
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error.message);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      console.log("📜 Rolando para o topo da lista de mensagens");
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      console.log("📥 Carregando mais mensagens...");
      fetchMessages(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) {
      console.warn("⚠️ Tentativa de enviar mensagem vazia");
      return;
    }

    if (!socket) {
      console.error("❌ Socket não está inicializado");
      Alert.alert("Erro", "Não foi possível enviar a mensagem. Tente novamente.");
      return;
    }

    if (isSending) {
      console.warn("⚠️ Envio de mensagem já em andamento");
      return;
    }

    setIsSending(true);
    console.log("📩 Preparando para enviar mensagem...");

    const messageData = {
      conversationId,
      senderId: userId,
      receiverId,
      content: newMessage,
    };

    console.log("📤 Emitindo evento sendMessage:", messageData);

    try {
      socket.emit("sendMessage", messageData);
      console.log("✅ Evento sendMessage emitido com sucesso");
    } catch (error) {
      console.error("❌ Erro ao emitir evento sendMessage:", error.message);
      Alert.alert("Erro", "Não foi possível enviar a mensagem. Tente novamente.");
    }

    setNewMessage("");
    Keyboard.dismiss();

    // Reativa o botão após um pequeno delay
    setTimeout(() => {
      setIsSending(false);
      console.log("✅ Estado de envio redefinido");
    }, 1000);
  };

  interface FileForUpload {
    uri: string;
    name: string;
    type: string;
  }

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled) {
        const file = result.assets[0];
        const formData = new FormData();

        const fileForUpload = {
          uri: file.uri,
          name: file.name || "uploaded_file",
          type: file.mimeType || "application/octet-stream",
        };

        formData.append("file", fileForUpload as any);
        formData.append("conversationId", conversationId);
        formData.append("senderId", userId);
        formData.append("receiverId", receiverId);

        console.log("📤 Enviando FormData:", {
          file: fileForUpload,
          conversationId,
          senderId: userId,
          receiverId,
        });

        setUploading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await axios.post(
          `https://cemear-b549eb196d7c.herokuapp.com/files/uploadChat`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
          }
        );

        console.log("✅ Resposta do upload:", response.data);

        if (response.status === 200) {
          Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
        } else {
          Alert.alert("Erro", "Falha ao enviar o arquivo.");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao fazer upload:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    if (!fileUrl || !filename) {
      Alert.alert("Erro", "URL ou nome do arquivo não encontrado.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const urlWithToken = `${fileUrl}?token=${encodeURIComponent(token)}`;

      console.log("📥 Abrindo arquivo no navegador:", urlWithToken);

      const canOpen = await Linking.canOpenURL(urlWithToken);
      if (canOpen) {
        await Linking.openURL(urlWithToken);
        console.log("✅ Arquivo aberto no navegador com sucesso.");
      } else {
        Alert.alert("Erro", "Não foi possível abrir o arquivo no navegador.");
      }
    } catch (error) {
      console.error("❌ Erro ao abrir o arquivo:", error);
      Alert.alert("Erro", "Não foi possível abrir o arquivo no navegador.");
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const checkColor = item.read ? "#00AEEF" : "#64748b";

    const hasAttachment = item.content?.startsWith("Arquivo enviado:");
    const filename = hasAttachment ? item.content.replace("Arquivo enviado: ", "") : null;
    const fileUrl = item.fileUrl || `https://cemear-b549eb196d7c.herokuapp.com/files/${item.id}`;

    return (
      <TouchableOpacity
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
        onPress={hasAttachment ? () => handleDownload(fileUrl, filename) : undefined}
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
            {hasAttachment ? (
              <>
                <Ionicons name="document-text" size={20} color="#00AEEF" style={styles.fileIcon} />
                <Text
                  style={[
                    styles.messageText,
                    isMyMessage ? styles.myMessageText : styles.otherMessageText,
                  ]}
                >
                  {filename} (Anexo)
                </Text>
              </>
            ) : (
              <Text
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
            )}
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
                  <Ionicons name="checkmark-done" size={16} color={checkColor} />
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#00AEEF" />
      </View>
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
            inverted={true}
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id} // Usa apenas o ID oficial
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasMore) handleLoadMore();
            }}
            onEndReachedThreshold={0.2}
            ListFooterComponent={renderFooter}
          />
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
            />
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Paperclip size={24} color="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
              ]}
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 20,
    paddingBottom: 10,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#e2e8f0",
    shadowOpacity: 0,
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00AEEF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#00AEEF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  uploadButtonDisabled: {
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
  fileIcon: {
    marginBottom: 8,
  },
  loader: {
    paddingVertical: 10,
    alignItems: "center",
  },
});

export default Chat;