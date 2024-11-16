import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import io from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";
const socket = io(BASE_URL, { path: "/socket.io" });

type PostType = {
  id: string;
  titulo: string;
  conteudo: string;
  imagePath: string | null;
  reactions: { [key: string]: number };
  comments: any[];
  user: { usuario: string } | null;
};

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  // Use o hook corretamente dentro do componente
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("Token de autenticação não encontrado.");
        return;
      }

      const response = await axios.get(`${BASE_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const posts = await Promise.all(
        response.data.map(async (post: PostType) => {
          const reactionCounts = await fetchReactionCounts(post.id);
          const comments = await fetchComments(post.id);
          return { ...post, reactions: reactionCounts, comments };
        })
      );

      setPosts(posts);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReactionCounts = async (postId: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/posts/${postId}/reactions/count`);
      return response.data.reactionCounts || {};
    } catch (error) {
      console.error("Erro ao buscar contagem de reações:", error);
      return {};
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");

      const response = await axios.get(`${BASE_URL}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data || [];
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      return [];
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Usuário não autenticado.");

      await axios.post(
        `${BASE_URL}/posts/${postId}/reaction`,
        { type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, reactions: { ...post.reactions, [reactionType]: (post.reactions[reactionType] || 0) + 1 } }
            : post
        )
      );
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  useEffect(() => {
    fetchPosts();

    socket.on("connect", () => {
      console.log("Conectado ao WebSocket");
    });

    socket.on("post-reaction-updated", async (updatedPost: PostType) => {
      const reactionCounts = await fetchReactionCounts(updatedPost.id);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === updatedPost.id ? { ...updatedPost, reactions: reactionCounts } : post
        )
      );
    });

    socket.on("comment-added", ({ postId, comment }) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments: [comment, ...post.comments] } : post
        )
      );
    });

    return () => {
      socket.off("post-reaction-updated");
      socket.off("comment-added");
      socket.disconnect();
    };
  }, []);

  const renderPost = ({ item }: { item: PostType }) => (
    <View style={styles.postContainer}>
      <Text style={styles.username}>{item.user?.usuario || "Usuário Anônimo"}</Text>
      {item.imagePath && <Image source={{ uri: item.imagePath }} style={styles.postImage} />}
      <Text style={styles.caption}>{item.titulo}</Text>
      <Text style={styles.content}>{item.conteudo}</Text>
  
      <TouchableOpacity onPress={() => navigation.navigate("ReactionList", { postId: item.id })}>
        <Text>Ver quem reagiu</Text>
      </TouchableOpacity>
  
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleReaction(item.id, "like")}>
          <Ionicons name="heart-outline" size={24} color="red" />
          <Text>{item.reactions?.like || 0}</Text>
        </TouchableOpacity>
  
        <TouchableOpacity onPress={() => navigation.navigate("Comments", { postId: item.id })}>
          <Ionicons name="chatbubble-outline" size={24} color="blue" />
          <Text>{item.comments?.length || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#0000ff" />
      ) : (
        <FlatList data={posts} renderItem={renderPost} keyExtractor={(item) => item.id} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  postContainer: {
    backgroundColor: "#fff",
    marginVertical: 10,
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  caption: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    marginTop: 5,
    fontSize: 14,
    color: "#333",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Feed;
