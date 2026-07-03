import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
} from "@expo-google-fonts/be-vietnam-pro";
import { Lora_500Medium, Lora_600SemiBold, Lora_600SemiBold_Italic } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { palette } from "@/constants/theme";
import { AuthProvider } from "@/lib/auth";
import { LangProvider } from "@/lib/i18n";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_600SemiBold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const subHeader = {
    headerShown: true,
    title: "",
    headerStyle: { backgroundColor: palette.paper },
    headerTintColor: palette.ink,
    headerShadowVisible: false,
  } as const;

  return (
    <LangProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.paper },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="handbook" options={subHeader} />
          <Stack.Screen name="landlord/verification" options={subHeader} />
          <Stack.Screen name="landlord/new-listing" options={subHeader} />
          <Stack.Screen name="admin/index" options={subHeader} />
          <Stack.Screen name="listing/[id]" options={subHeader} />
          <Stack.Screen name="landlords/[id]" options={subHeader} />
          <Stack.Screen name="chat/[id]" options={subHeader} />
          <Stack.Screen name="tenancy/index" options={subHeader} />
          <Stack.Screen name="tenancy/new" options={subHeader} />
          <Stack.Screen name="tenancy/[id]" options={subHeader} />
          <Stack.Screen name="landlord/listings" options={subHeader} />
          <Stack.Screen name="contract/[listingId]" options={subHeader} />
        </Stack>
      </AuthProvider>
    </LangProvider>
  );
}
