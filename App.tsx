import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity } from 'react-native';
import Navbar from './src/components/NavBar';
import Feed from './src/components/Feed';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';

enableScreens();

// Previne que o SplashScreen esconda antes de carregar as fontes
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'), // Corrige o caminho da fonte
      });
      setFontsLoaded(true);
      await SplashScreen.hideAsync(); // Esconde o SplashScreen após carregar as fontes
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
    }
  };

  useEffect(() => {
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Não renderiza nada até que as fontes estejam carregadas
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const HomeScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <Navbar />
    <Feed />
    <View style={styles.footerButtons}>
      <TouchableOpacity style={styles.button}>
        <Ionicons name="home-outline" size={24} color="black" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button}>
        <Ionicons name="add-circle-outline" size={24} color="black" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button}>
        <Ionicons name="heart-outline" size={24} color="black" />
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
