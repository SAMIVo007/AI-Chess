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
import * as NavigationBar from "expo-navigation-bar";
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

if (!__DEV__) {
	console.log = () => {};
	console.warn = () => {};
	console.error = () => {};
}

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

	// Hide Android navigation bar app-wide for immersive experience
	useEffect(() => {
		NavigationBar.setVisibilityAsync("hidden");
	}, []);

	if (!loaded) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AuthContextProvider>
				<ThemeProvider
					// value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
					value={DarkTheme}
				>
					<AppNavigator />
					<StatusBar style="light" />
				</ThemeProvider>
			</AuthContextProvider>
		</GestureHandlerRootView>
	);
}

export const AppNavigator = () => {
	const { session, loading } = useAuth();
	const router = useRouter();

	// Handle deep links
	useEffect(() => {
		const handleDeepLink = (url: string) => {
			console.log("[DeepLink] Incoming URL:", url);

			// Parse parameters from both fragment (#) and query string (?)
			// OAuth redirects often put tokens in the fragment.
			let params = new URLSearchParams();

			if (url.includes("#")) {
				const fragment = url.split("#")[1];
				const fragmentParams = new URLSearchParams(fragment);
				fragmentParams.forEach((val, key) => params.append(key, val));
			}

			if (url.includes("?")) {
				const query = url.split("?")[1];
				const queryParams = new URLSearchParams(query);
				queryParams.forEach((val, key) => {
					// Prefer fragment params if duplicates exist (standard OAuth behavior)
					if (!params.has(key)) params.append(key, val);
				});
			}

			const access_token = params.get("access_token");
			const refresh_token = params.get("refresh_token");
			const error_description = params.get("error_description");
			const error_code = params.get("error_code");

			if (access_token && refresh_token) {
				console.log("[DeepLink] Found session tokens. Setting session...");
				supabase.auth
					.setSession({
						access_token,
						refresh_token,
					})
					.then(({ error }) => {
						if (error) console.error("[DeepLink] Supabase session error:", error);
						else console.log("[DeepLink] Session set successfully.");
					});
			} else if (error_description) {
				const decodedError = decodeURIComponent(
					error_description.replace(/\+/g, " "),
				);
				console.error(`[DeepLink] Auth Error: ${error_code} - ${decodedError}`);
				Alert.alert("Authentication Error", decodedError);
			}

			const route = url.replace(/.*?:\/\//g, "");

			// Handle join game links: aichess://join/ABC123
			// Route '/join-game' was removed. We redirect to 'challenge-friends' or handle appropriately.
			// For now, let's just log it or redirect to home if no valid route.
			if (route.startsWith("join/")) {
				console.log(
					"[DeepLink] Join game link detected but join-game route is missing.",
				);
				router.push("/challenge-friends");
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
			linkingListener?.remove();
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
			{/* Always-accessible screens (offline-capable) */}
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="offline-game" options={{ headerShown: false }} />
			<Stack.Screen
				name="play-options"
				options={{
					title: "Play Options",
					headerTitleAlign: "center",
					headerShown: false,
				}}
			/>

			{/* Online-only screens — require auth */}
			<Stack.Protected guard={!!session}>
				<Stack.Screen name="account" options={{ headerShown: false }} />
				<Stack.Screen name="online-game" options={{ headerShown: false }} />
				<Stack.Screen
					name="challenge-friends"
					options={{
						title: "Play with Friends",
						headerTitleAlign: "center",
						headerShown: false,
					}}
				/>
			</Stack.Protected>

			{/* Auth screen — shown when not logged in */}
			<Stack.Protected guard={!session}>
				<Stack.Screen name="auth" options={{ headerShown: false }} />
			</Stack.Protected>

			<Stack.Screen name="+not-found" />
		</Stack>
		// <StatusBar style="auto" />
	);
};
