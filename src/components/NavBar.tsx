import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-ionicons';

const Navbar: React.FC = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity>
        <Icon name="menu-outline" size={28} color="black" />
      </TouchableOpacity>
      <Text style={styles.title}>Cemear App</Text>
      <TouchableOpacity>
        <Icon name="notifications-outline" size={28} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Alinha os elementos verticalmente no centro
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    height: 80, // Mantém a altura definida
    paddingTop: 10, // Ajusta o espaçamento superior dentro do navbar
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default Navbar;
