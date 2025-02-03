import messaging from '@react-native-firebase/messaging';

async function refreshToken() {
  await messaging().deleteToken(); // Apaga o token antigo
  const newToken = await messaging().getToken(); // Gera um novo token
  console.log('Novo token gerado:', newToken);
}

refreshToken();
