// src/screens/Comments.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
    }
  };

  const renderComment = ({ item }: { item: CommentType }) => (
    <View style={styles.commentContainer}>
      <Text style={styles.username}>{item.user.usuario}</Text>
      <Text>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Adicionar comentário"
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity onPress={handleAddComment}>
              <Ionicons name="send" size={24} color="blue" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  commentContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
  username: {
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eaeaea",
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
  },
});

export default CommentsScreen;
