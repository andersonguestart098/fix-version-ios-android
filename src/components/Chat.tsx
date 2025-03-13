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
} from "react-native";
import { SendHorizontal as SendHorizontal, Paperclip, Download } from "lucide-react-native"; // Adicionei o ícone Download
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";

// Tipagem para as props do componente Chat usando React Navigation
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

const BASE_URL = "http://192.168.0.61:3001";

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
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const soundObjectRef = useRef(null);

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
    if (!conversationId || !userId) return;

    const newSocket = io("http://192.168.0.61:3001", { query: { userId } }); // Corrigido para o backend local
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket conectado!");
      newSocket.emit("joinConversation", conversationId);
    });

    newSocket.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      scrollToBottom();
      if (message.senderId !== userId) {
        playNotificationSound();
      }
    });

    newSocket.on("messagesRead", ({ conversationId: convId, userId: readerId }) => {
      if (convId === conversationId && readerId === receiverId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => ({ ...msg, read: true }))
        );
      }
    });

    fetchMessages();

    return () => {
      newSocket.disconnect();
    };
  }, [conversationId, userId]);

  const playNotificationSound = async () => {
    if (soundObjectRef.current) {
      try {
        await soundObjectRef.current.replayAsync();
        console.log("Som de notificação tocado com sucesso");
      } catch (error) {
        console.error("Erro ao tocar o som:", error);
      }
    } else {
      console.log("Som não carregado ainda");
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
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
      Alert.alert("Erro", "Não foi possível carregar as mensagens.");
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
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await fetch(`${BASE_URL}/conversations/${conversationId}/messages/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      socket?.emit("messagesRead", { conversationId, userId });
      setMessages((prevMessages) =>
        prevMessages.map((msg) => ({ ...msg, read: true }))
      );
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
  };

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
    Keyboard.dismiss();
  };

  // Tipagem personalizada para o objeto de arquivo em React Native
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

        const fileForUpload: FileForUpload = {
          uri: file.uri,
          name: file.name || "uploaded_file",
          type: file.mimeType || "application/octet-stream",
        };

        formData.append("file", fileForUpload as any);
        formData.append("conversationId", conversationId);
        formData.append("senderId", userId);
        formData.append("receiverId", receiverId);

        setUploading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await axios.post(`${BASE_URL}/files/uploadChat`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.status === 200) {
          Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
          fetchMessages();
        } else {
          Alert.alert("Erro", "Falha ao enviar o arquivo.");
        }
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      Alert.alert("Erro", "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl: string, filename: string, mimetype?: string) => {
    if (!fileUrl || !filename) {
      Alert.alert("Erro", "URL ou nome do arquivo não encontrado.");
      return;
    }

    try {
      // Baixar o arquivo temporariamente para o cacheDirectory
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResumable = FileSystem.createDownloadResumable(fileUrl, fileUri);
      const downloadedFile = await downloadResumable.downloadAsync();

      if (!downloadedFile?.uri) {
        Alert.alert("Erro", "Não foi possível baixar o arquivo.");
        return;
      }

      // Verificar se o compartilhamento está disponível
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          mimeType: mimetype || "application/octet-stream", // Usa o mimetype passado ou um valor padrão
          dialogTitle: `Salvar ou compartilhar ${filename}`,
        });
      } else {
        // Fallback caso o compartilhamento não esteja disponível
        Alert.alert("Sucesso", `Arquivo baixado em: ${downloadedFile.uri}`);
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      Alert.alert("Erro", "Não foi possível baixar o arquivo.");
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === userId;
    const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const checkColor = item.read ? "#00AEEF" : "#64748b";

    // Verifica se há um anexo (content começando com "Arquivo enviado:")
    const hasAttachment = item.content?.startsWith("Arquivo enviado:");

    if (hasAttachment) {
      // Extrai o nome do arquivo do content
      const filename = item.content.replace("Arquivo enviado: ", "");
      // Usa fileUrl se disponível, ou constrói com base no message.id
      const fileUrl = item.fileUrl || `${BASE_URL}/files/${item.id}`;

      return (
        <TouchableOpacity
          style={[
            styles.messageWrapper,
            isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
          ]}
          onPress={() => handleDownload(fileUrl, filename, item.mimetype)}
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
              <Ionicons name="document-text" size={20} color="#00AEEF" style={styles.fileIcon} />
              <Text
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {filename} (Anexo)
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
                    <Ionicons name="checkmark-done" size={16} color={checkColor} />
                  </View>
                )}
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      );
    }

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
                  <Ionicons name="checkmark-done" size={16} color={checkColor} />
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
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
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
                !newMessage.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <SendHorizontal size={28} color="white" strokeWidth={2.5} />
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
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 174, 239, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  downloadButtonText: {
    color: "#00AEEF",
    fontSize: 14,
    marginLeft: 4,
  },
});

export default Chat;