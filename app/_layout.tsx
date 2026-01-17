import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { supabase } from "@/utils/supabase";
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
import { ActivityIndicator, Alert, Linking, View } from "react-native";
import { useRouter } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
	fade: true,
	duration: 500,
});

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
	const { session, loading } = useAuth();
	const router = useRouter();

	// Handle deep links
	useEffect(() => {
		const handleDeepLink = (url: string) => {
			if (url.includes("access_token") && url.includes("refresh_token")) {
				const params = new URLSearchParams(url.split("#")[1]);
				const access_token = params.get("access_token");
				const refresh_token = params.get("refresh_token");

				if (access_token && refresh_token) {
					supabase.auth.setSession({
						access_token,
						refresh_token,
					});
				}
			} else if (url.includes("error_description")) {
				const params = new URLSearchParams(url.split("#")[1]);
				const error_description = params.get("error_description");
				const error_code = params.get("error_code");

				if (error_description) {
					const decodedError = decodeURIComponent(
						error_description.replace(/\+/g, " ")
					);
					console.error(`[DeepLink] Error: ${error_code} - ${decodedError}`);
					Alert.alert("Link Expired or Invalid", decodedError);
				}
			}

			const route = url.replace(/.*?:\/\//g, "");

			// Handle join game links: aichess://join/ABC123
			if (route.startsWith("join/")) {
				const inviteCode = route.split("/")[1];
				if (inviteCode) {
					router.push({
						pathname: "/join-game",
						params: { inviteCode },
					});
				}
			}
		};

		// Handle incoming links when app is already open
		const linkingListener = Linking.addEventListener("url", (event) => {
			handleDeepLink(event.url);
		});

		// Handle links when app is opened from a cold start
		Linking.getInitialURL().then((url) => {
			if (url) {
				handleDeepLink(url);
			}
		});

		return () => {
			// @ts-ignore
			// linkingListener?.remove();
		};
	}, []);

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<Stack>
			<Stack.Protected guard={!!session}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="game" options={{ headerShown: false }} />
				<Stack.Screen name="new-game" options={{ headerShown: false }} />
				<Stack.Screen
					name="join-game"
					options={{
						title: "Joining Game...",
						headerTitleAlign: "center",
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
						title: "Play with Friends",
						headerTitleAlign: "center",
					}}
				/>
				<Stack.Screen name="+not-found" />
			</Stack.Protected>

			<Stack.Protected guard={!session}>
				<Stack.Screen name="auth" options={{ headerShown: false }} />
			</Stack.Protected>
		</Stack>
		// <StatusBar style="auto" />
	);
};
