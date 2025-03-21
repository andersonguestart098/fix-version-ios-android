import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type CommentType = {
  id: string;
  content: string;
  user: { usuario: string };
};

const CommentsScreen: React.FC = () => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const route = useRoute<RouteProp<RootStackParamList, "Comments">>();
  const { postId } = route.params;

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${BASE_URL}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(response.data);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      console.warn("⚠️ Tentativa de enviar comentário vazio");
      return;
    }

    if (isSending) {
      console.warn("⚠️ Envio de comentário já em andamento");
      return;
    }

    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/posts/${postId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([response.data, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
    } finally {
      setIsSending(false);
    }
  };

  const renderComment = ({ item }: { item: CommentType }) => (
    <View style={styles.commentContainer}>
      <Text style={styles.username}>{item.user.usuario}</Text>
      <Text>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 25}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#00AEEF" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsList}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Adicionar comentário..."
              placeholderTextColor="#94a3b8"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSending}
            >
              <Ionicons name="send" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Alinhado com o fundo do Chat
  },
  commentsList: {
    paddingVertical: 20,
    paddingBottom: 10,
  },
  commentContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    marginHorizontal: 16,
  },
  username: {
    fontWeight: "bold",
    color: "#334155",
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
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CommentsScreen;