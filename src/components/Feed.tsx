import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons'; // Alterando para @expo/vector-icons
import 'react-native-gesture-handler';
import { RootStackParamList } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para armazenar e recuperar token no RN.

const BASE_URL = 'https://cemear-b549eb196d7c.herokuapp.com';
const socket = io(BASE_URL, { path: '/socket.io' });

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feed'>;

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<FeedScreenNavigationProp>();

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(page === 1); // Somente exibir carregamento ao buscar a primeira página
      const response = await axios.get(`${BASE_URL}/posts`, {
        params: { page, limit: 10 },
      });
      setPosts((prevPosts) =>
        page === 1 ? response.data.posts : [...prevPosts, ...response.data.posts]
      );
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    socket.on('new-post', (newPost) => {
      setPosts((prev) => [newPost, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado.');

      const response = await axios.post(
        `${BASE_URL}/posts/${postId}/reaction`,
        { type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? response.data : post))
      );
    } catch (error) {
      console.error('Erro ao reagir:', error);
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postContainer}>
      <Text style={styles.username}>{item.user?.usuario || 'Usuário'}</Text>
      {item.imagePath && (
        <Image source={{ uri: item.imagePath }} style={styles.postImage} />
      )}
      <Text style={styles.caption}>{item.titulo}</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleReaction(item.id, 'like')}>
          <Ionicons name="heart-outline" size={24} color="red" />
          <Text>{item.reactions?.filter((r: any) => r.type === 'like').length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Comments', { postId: item.id })}
        >
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
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={() => setPage((prev) => prev + 1)}
          onEndReachedThreshold={0.5}
          onRefresh={() => {
            setRefreshing(true);
            setPage(1);
            fetchPosts();
          }}
          refreshing={refreshing}
          ListEmptyComponent={() => (
            <View style={styles.emptyList}>
              <Text>Nenhum post encontrado.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  postContainer: {
    backgroundColor: '#fff',
    marginVertical: 10,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  caption: {
    marginTop: 10,
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});

export default Feed;
