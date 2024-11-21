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
  comments: { length: number };
  user: {
    id: string;
    usuario: string;
    avatar: string | null;
  } | null;
};

// Configuração do Axios para incluir o token automaticamente
axios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/posts`);
      const enrichedPosts = await Promise.all(
        response.data.map(async (post: PostType) => {
          const reactions = await fetchReactionCounts(post.id);
          const commentsCount = await fetchCommentCount(post.id);
          return { ...post, reactions, comments: { length: commentsCount } };
        })
      );

      setPosts(enrichedPosts);
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

  const fetchCommentCount = async (postId: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/posts/${postId}/comments/count`);
      return response.data.commentCount || 0;
    } catch (error) {
      console.error("Erro ao buscar contagem de comentários:", error);
      return 0;
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const response = await axios.post(`${BASE_URL}/posts/${postId}/reaction`, {
        type: reactionType,
      });

      const updatedPost = response.data;
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === updatedPost.id ? { ...post, reactions: updatedPost.reactions } : post
        )
      );
    } catch (error) {
      console.error("Erro ao registrar reação:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error("Erro de autenticação. Verifique seu token.");
      }
    }
  };

  useEffect(() => {
    fetchPosts();

    socket.on("connect", () => {
      console.log("Conectado ao WebSocket");
    });

    socket.on("post-reaction-updated", (updatedPost: PostType) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === updatedPost.id ? { ...post, ...updatedPost } : post
        )
      );
    });

    socket.on("comment-added", ({ postId }) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: { length: post.comments.length + 1 } }
            : post
        )
      );
    });

    return () => {
      socket.off("post-reaction-updated");
      socket.off("comment-added");
      socket.disconnect();
    };
  }, []);

  const renderPost = ({ item }: { item: PostType }) => {
    const avatarUri = imageErrors[item.id]
      ? "https://via.placeholder.com/50"
      : item.user?.avatar || "https://via.placeholder.com/50";

    return (
      <View style={styles.postContainer}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
          />
          <Text style={styles.username}>{item.user?.usuario || "Usuário Anônimo"}</Text>
        </View>
        {item.imagePath && <Image source={{ uri: item.imagePath }} style={styles.postImage} />}
        <Text style={styles.caption}>{item.titulo}</Text>
        <Text style={styles.content}>{item.conteudo}</Text>

        <TouchableOpacity onPress={() => navigation.navigate("ReactionList", { postId: item.id })}>
          <Text style={styles.reactionText}>Ver quem reagiu</Text>
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
  };

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
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
  reactionText: {
    marginTop: 10,
    fontSize: 14,
    color: "#007AFF",
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
