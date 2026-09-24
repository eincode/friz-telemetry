import { useFonts } from "expo-font";
import { useKeepAwake } from "expo-keep-awake";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Platform, StatusBar, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Buffer } from "buffer";
import { useEffect } from "react";

global.Buffer = global.Buffer || Buffer;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    "Barlow-Black": require("../../assets/fonts/Barlow-Black.ttf"),
    "Barlow-BlackItalic": require("../../assets/fonts/Barlow-BlackItalic.ttf"),
    "Barlow-Bold": require("../../assets/fonts/Barlow-Bold.ttf"),
    "Barlow-BoldItalic": require("../../assets/fonts/Barlow-BoldItalic.ttf"),
    "Barlow-ExtraBold": require("../../assets/fonts/Barlow-ExtraBold.ttf"),
    "Barlow-ExtraBoldItalic": require("../../assets/fonts/Barlow-ExtraBoldItalic.ttf"),
    "Barlow-ExtraLight": require("../../assets/fonts/Barlow-ExtraLight.ttf"),
    "Barlow-ExtraLightItalic": require("../../assets/fonts/Barlow-ExtraLightItalic.ttf"),
    "Barlow-Italic": require("../../assets/fonts/Barlow-Italic.ttf"),
    "Barlow-Light": require("../../assets/fonts/Barlow-Light.ttf"),
    "Barlow-LightItalic": require("../../assets/fonts/Barlow-LightItalic.ttf"),
    "Barlow-Medium": require("../../assets/fonts/Barlow-Medium.ttf"),
    "Barlow-MediumItalic": require("../../assets/fonts/Barlow-MediumItalic.ttf"),
    "Barlow-Regular": require("../../assets/fonts/Barlow-Regular.ttf"),
    "Barlow-SemiBold": require("../../assets/fonts/Barlow-SemiBold.ttf"),
    "Barlow-SemiBoldItalic": require("../../assets/fonts/Barlow-SemiBoldItalic.ttf"),
    "Barlow-Thin": require("../../assets/fonts/Barlow-Thin.ttf"),
    "Barlow-ThinItalic": require("../../assets/fonts/Barlow-ThinItalic.ttf"),
    "IBMPlexMono-Bold": require("../../assets/fonts/IBMPlexMono-Bold.ttf"),
    "IBMPlexMono-BoldItalic": require("../../assets/fonts/IBMPlexMono-BoldItalic.ttf"),
    "IBMPlexMono-ExtraLight": require("../../assets/fonts/IBMPlexMono-ExtraLight.ttf"),
    "IBMPlexMono-ExtraLightItalic": require("../../assets/fonts/IBMPlexMono-ExtraLightItalic.ttf"),
    "IBMPlexMono-Italic": require("../../assets/fonts/IBMPlexMono-Italic.ttf"),
    "IBMPlexMono-Light": require("../../assets/fonts/IBMPlexMono-Light.ttf"),
    "IBMPlexMono-LightItalic": require("../../assets/fonts/IBMPlexMono-LightItalic.ttf"),
    "IBMPlexMono-Medium": require("../../assets/fonts/IBMPlexMono-Medium.ttf"),
    "IBMPlexMono-MediumItalic": require("../../assets/fonts/IBMPlexMono-MediumItalic.ttf"),
    "IBMPlexMono-Regular": require("../../assets/fonts/IBMPlexMono-Regular.ttf"),
    "IBMPlexMono-SemiBold": require("../../assets/fonts/IBMPlexMono-SemiBold.ttf"),
    "IBMPlexMono-SemiBoldItalic": require("../../assets/fonts/IBMPlexMono-SemiBoldItalic.ttf"),
    "IBMPlexMono-Thin": require("../../assets/fonts/IBMPlexMono-Thin.ttf"),
    "IBMPlexMono-ThinItalic": require("../../assets/fonts/IBMPlexMono-ThinItalic.ttf"),
    "SairaCondensed-Black": require("../../assets/fonts/SairaCondensed-Black.ttf"),
    "SairaCondensed-Bold": require("../../assets/fonts/SairaCondensed-Bold.ttf"),
    "SairaCondensed-ExtraBold": require("../../assets/fonts/SairaCondensed-ExtraBold.ttf"),
    "SairaCondensed-ExtraLight": require("../../assets/fonts/SairaCondensed-ExtraLight.ttf"),
    "SairaCondensed-Light": require("../../assets/fonts/SairaCondensed-Light.ttf"),
    "SairaCondensed-Medium": require("../../assets/fonts/SairaCondensed-Medium.ttf"),
    "SairaCondensed-Regular": require("../../assets/fonts/SairaCondensed-Regular.ttf"),
    "SairaCondensed-SemiBold": require("../../assets/fonts/SairaCondensed-SemiBold.ttf"),
    "SairaCondensed-Thin": require("../../assets/fonts/SairaCondensed-Thin.ttf"),
    "MonomaniacOne-Regular": require("../../assets/fonts/MonomaniacOne-Regular.ttf"),
  });

  const colorScheme = useColorScheme();

  useKeepAwake();
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {Platform.OS === "android" && <StatusBar hidden />}
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
