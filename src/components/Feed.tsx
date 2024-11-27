import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
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

axios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    {[...Array(5)].map((_, index) => (
      <View key={index} style={styles.skeletonPost}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonText} />
        <View style={styles.skeletonImage} />
      </View>
    ))}
  </View>
);

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
            ? { ...post, comments: { length: (post.comments?.length || 0) + 1 } }
            : post
        )
      );
    });

    socket.on("new-post", (newPost: PostType) => {
      setPosts((prevPosts) => [newPost, ...prevPosts]);
    });

    return () => {
      socket.off("post-reaction-updated");
      socket.off("comment-added");
      socket.off("new-post");
    };
  }, []);

  const openImageFullScreen = (imageUri: string) => {
    setSelectedImage(imageUri);
  };

  const closeImageFullScreen = () => {
    setSelectedImage(null);
  };

  const renderPost = ({ item }: { item: PostType }) => {
    const avatarUri = item.user?.avatar || "https://via.placeholder.com/50";

    return (
      <View style={styles.postContainer}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{item.user?.usuario || "Usuário Anônimo"}</Text>
        </View>

        {item.imagePath && (
          <TouchableOpacity onPress={() => openImageFullScreen(item.imagePath)}>
            <Image source={{ uri: item.imagePath }} style={styles.postImage} />
          </TouchableOpacity>
        )}

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
          <TouchableOpacity
            onPress={() => navigation.navigate("Comments", { postId: item.id })}
          >
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
        <SkeletonLoader />
      ) : (
        <FlatList data={posts} renderItem={renderPost} keyExtractor={(item) => item.id} />
      )}

      {selectedImage && (
        <Modal visible={true} transparent={true} animationType="none">
          <TouchableOpacity style={styles.fullScreenImageContainer} onPress={closeImageFullScreen}>
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
          </TouchableOpacity>
        </Modal>
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
  skeletonContainer: {
    padding: 10,
  },
  skeletonPost: {
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C0C0C0",
    marginBottom: 10,
  },
  skeletonText: {
    height: 20,
    width: "60%",
    backgroundColor: "#C0C0C0",
    borderRadius: 5,
    marginBottom: 10,
  },
  skeletonImage: {
    height: 200,
    backgroundColor: "#C0C0C0",
    borderRadius: 10,
  },
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});

export default Feed;
