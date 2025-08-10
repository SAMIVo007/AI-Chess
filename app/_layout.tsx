import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import {
	configureReanimatedLogger,
	ReanimatedLogLevel,
} from "react-native-reanimated";

configureReanimatedLogger({
	level: ReanimatedLogLevel.warn,
	strict: false, // Reanimated runs in strict mode by default
});

import { useColorScheme } from "@/hooks/useColorScheme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AuthContextProvider, { useAuth } from "@/context/AuthContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return (
		<AuthContextProvider>
			<GestureHandlerRootView>
				<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
					<AppNavigator />
					<StatusBar style="auto" />
				</ThemeProvider>
			</GestureHandlerRootView>
		</AuthContextProvider>
	);
}

export const AppNavigator = () => {
	const { session } = useAuth();

	return (
		<Stack>
			<Stack.Protected guard={!!session}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen
					name="game"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="play-options"
					options={{
						title: "Play Options",
						headerTitleAlign: "center",
					}}
				/>
				<Stack.Screen
					name="challenge-friends"
					options={{
						title: "Challenge Friends",
						headerTitleAlign: "center",
					}}
				/>
				<Stack.Screen name="+not-found" />
			</Stack.Protected>

			<Stack.Protected guard={!session}>
				<Stack.Screen
					name="auth"
					options={{
						headerShown: false,
					}}
				/>
			</Stack.Protected>
		</Stack>
	);
};
