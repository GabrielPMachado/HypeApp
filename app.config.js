// Configuração do Expo em JS (em vez de app.json) para poder ler variáveis
// de ambiente se precisar. O Expo CLI já carrega o .env automaticamente
// antes de avaliar este arquivo. O app é só para iPhone (e web).
module.exports = {
  expo: {
    name: "HypeApp",
    slug: "HypeApp",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "hypeapp",
    userInterfaceStyle: "dark",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hypeapp.app",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      // Na SDK 57 o plugin só lê estas opções (o campo "splash" do topo é
      // ignorado) — sem elas o app abre com o splash branco padrão.
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          imageWidth: 240,
          resizeMode: "contain",
          backgroundColor: "#0A0A0D",
        },
      ],
      "expo-status-bar",
      "@react-native-google-signin/google-signin",
      // Check-in por proximidade (ver utils/checkin.ts): só localização
      // "em uso" (nunca em segundo plano), pedida na hora de avaliar um
      // bar, pra confirmar que a pessoa está de verdade lá.
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "O HypeApp usa sua localização só na hora de avaliar um bar, pra confirmar que você está lá.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
