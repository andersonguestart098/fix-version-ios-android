import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from "react-native";
import axios from "axios";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type ReactionDetail = {
  id: string;
  type: string;
  user: {
    usuario: string;
    avatar: string | null; // URL do avatar do usuário
  };
};

const ReactionList: React.FC = () => {
  const [reactions, setReactions] = useState<ReactionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const route = useRoute();
  const { postId } = route.params as { postId: string };

  const fetchReactionDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("Token de autenticação não encontrado.");
        return;
      }

      const response = await axios.get(`${BASE_URL}/posts/${postId}/reactions/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReactions(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes das reações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReactionDetails();
  }, []);

  const renderReaction = ({ item }: { item: ReactionDetail }) => (
    <View style={styles.reactionContainer}>
      <Image
        source={{ uri: item.user.avatar || "https://via.placeholder.com/50" }}
        style={styles.avatar}
      />
      <View style={styles.reactionInfo}>
        <Text style={styles.username}>{item.user.usuario}</Text>
        <Text style={styles.reactionType}>{item.type}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={reactions}
          renderItem={renderReaction}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  reactionContainer: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  reactionInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
  },
  reactionType: {
    fontSize: 14,
    color: "#555",
  },
});

export default ReactionList;
