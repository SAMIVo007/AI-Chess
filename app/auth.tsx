import React, { useState, useEffect } from "react";
import {
	Alert,
	StyleSheet,
	View,
	AppState,
	Text,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Dimensions,
	ActivityIndicator,
	TouchableOpacity,
	Linking,
} from "react-native";
import {
	GoogleSignin,
	statusCodes,
	isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { supabase } from "@/utils/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "pressto";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
	FadeInDown,
	FadeInUp,
	LinearTransition,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground.
AppState.addEventListener("change", (state) => {
	if (state === "active") {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});

// Configure Google Sign-In
GoogleSignin.configure({
	webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
});

const { width, height } = Dimensions.get("window");

export default function Auth() {
	const router = useRouter();
	const { session, setHasSeenAuth } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [website, setWebsite] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
	const [showEmailForm, setShowEmailForm] = useState(false);

	async function signInWithEmail() {
		setLoading(true);
		const { error, data } = await supabase.auth.signInWithPassword({
			email: email,
			password: password,
		});
		if (error) Alert.alert("Sign In Failed", error.message);
		setLoading(false);
	}

	async function signUpWithEmail() {
		setLoading(true);
		const {
			data: { session },
			error,
		} = await supabase.auth.signUp({
			email: email,
			password: password,
			options: {
				emailRedirectTo: "aichess://",
				data: {
					username: username,
				},
			},
		});

		if (error) Alert.alert("Sign Up Failed", error.message);
		else if (!session)
			Alert.alert(
				"Registration Successful",
				"Please check your inbox (or spam folder) for email verification!",
			);
		setLoading(false);
	}

	async function signInWithGoogle() {
		try {
			await GoogleSignin.hasPlayServices();
			const response = await GoogleSignin.signIn();

			if (isSuccessResponse(response)) {
				const { idToken } = response.data;
				if (!idToken) {
					Alert.alert("Error", "No ID Token returned from Google.");
					return;
				}

				setGoogleLoading(true);
				const { error } = await supabase.auth.signInWithIdToken({
					provider: "google",
					token: idToken,
				});
				if (error) {
					Alert.alert("Google Sign-In Failed", error.message);
				}
				setGoogleLoading(false);
			}
		} catch (error: any) {
			setGoogleLoading(false);
			if (error.code === statusCodes.IN_PROGRESS) {
				// Operation (e.g. sign in) is in progress already
			} else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
				Alert.alert("Error", "Google Play Services not available.");
			} else {
				Alert.alert("Google Sign-In Error", "Sign in was canceled or failed.");
			}
		}
	}

	const handleSubmit = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (mode === "signIn") signInWithEmail();
		else signUpWithEmail();
	};

	return (
		<View style={{ flex: 1 }}>
			{/* Animated Gradient Background */}
			<LinearGradient
				colors={["#62759eff", "#1e1b4b", "#0c0a31ff"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: "center",
						padding: 12,
					}}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<Animated.View
						entering={FadeInDown.delay(100).springify()}
						layout={LinearTransition.springify()}
						style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}
					>
						<View
							style={{
								borderRadius: 24,
								padding: 24,
								overflow: "hidden",
								// backgroundColor: "rgba(30, 41, 59, 0.4)",
								// borderColor: "rgba(255,255,255,0.1)",
								borderWidth: 0,
							}}
						>
							{/* Header */}
							<View className="items-center mb-32">
								<Animated.View
									entering={FadeInUp.delay(200).springify()}
									style={{
										marginBottom: 16,
										width: 80,
										height: 80,
										borderRadius: 24,
										alignItems: "center",
										justifyContent: "center",
										elevation: 10,
										shadowColor: "#000",
										shadowOffset: {
											height: 2,
											width: 0,
										},
										shadowOpacity: 0.25,
										shadowRadius: 3.84,
										overflow: "hidden",
									}}
								>
									{/* <MaterialCommunityIcons name="chess-king" size={40} color="white" /> */}
									<Image
										source={require("@/assets/images/app-logo.png")}
										style={{ width: "100%", height: "100%" }}
										contentFit="cover"
									/>
								</Animated.View>
								<Text className="text-3xl font-bold text-white mb-2 tracking-tight">
									Welcome
								</Text>
								<Text className="text-gray-300 text-center font-medium">
									Sign in to continue your chess journey.
								</Text>
							</View>

							{/* Main Buttons */}
							<View className="gap-4">
								{/* 1. Google Sign-In — Most Prominent */}
								<PressableScale
									onPress={() => {
										if (!googleLoading) {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											signInWithGoogle();
										}
									}}
									style={{
										height: 56,
										borderRadius: 16,
										width: "100%",
										backgroundColor: "#4285F4",
										flexDirection: "row",
										alignItems: "center",
										padding: 2,
									}}
								>
									<View
										style={{
											height: "100%",
											aspectRatio: 1,
											backgroundColor: "white",
											borderRadius: 14,
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										{googleLoading ? (
											<ActivityIndicator color="#4285F4" />
										) : (
											<Image
												source={require("@/assets/images/google-logo.svg")}
												style={{ width: 24, height: 24 }}
												contentFit="contain"
											/>
										)}
									</View>

									<View
										style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
									>
										<Text
											className="text-white font-bold text-[17px]"
											style={{ paddingRight: 24 }}
										>
											Continue with Google
										</Text>
									</View>
								</PressableScale>

								{/* 2. Continue with Email — Expandable */}
								<PressableScale
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										setShowEmailForm(!showEmailForm);
									}}
									style={{
										height: 56,
										borderRadius: 16,
										width: "100%",
										backgroundColor: "rgba(255,255,255,0.08)",
										borderWidth: 1,
										borderColor: "rgba(255,255,255,0.15)",
										flexDirection: "row",
										alignItems: "center",
										padding: 2,
									}}
								>
									<View
										style={{
											height: "100%",
											aspectRatio: 1,
											backgroundColor: "rgba(129, 140, 248, 0.2)",
											borderRadius: 14,
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<MaterialCommunityIcons
											name="email-outline"
											size={24}
											color="#818cf8"
										/>
									</View>
									<View
										style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
									>
										<Text className="text-white text-[17px]" style={{ paddingRight: 24 }}>
											Continue with Email
										</Text>
									</View>
								</PressableScale>

								{/* Email Form — Expanded */}
								{showEmailForm && (
									<Animated.View
										entering={FadeInDown.springify()}
										layout={LinearTransition.springify()}
										style={{
											backgroundColor: "rgba(0,0,0,0.15)",
											borderRadius: 16,
											padding: 16,
											borderWidth: 1,
											borderColor: "rgba(255,255,255,0.08)",
											gap: 16,
										}}
									>
										{mode === "signUp" && (
											<Animated.View
											// entering={FadeInDown.springify()}
											// exiting={FadeInUp.springify()}
											>
												<Text className="text-xs font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
													Username
												</Text>
												<View className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex-row items-center">
													<MaterialCommunityIcons
														name="account-outline"
														size={20}
														color="#94a3b8"
													/>
													<TextInput
														className="flex-1 ml-3 text-base text-white"
														placeholder="ChessMaster9000"
														placeholderTextColor="#64748b"
														autoCapitalize="none"
														value={username}
														onChangeText={setUsername}
														selectionColor="#818cf8"
														keyboardAppearance="dark"
													/>
												</View>
											</Animated.View>
										)}

										<View>
											<Text className="text-xs font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
												Email
											</Text>
											<View className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex-row items-center">
												<MaterialCommunityIcons
													name="email-outline"
													size={20}
													color="#94a3b8"
												/>
												<TextInput
													className="flex-1 ml-3 text-base text-white"
													placeholder="you@example.com"
													placeholderTextColor="#64748b"
													autoCapitalize="none"
													value={email}
													onChangeText={setEmail}
													keyboardType="email-address"
													selectionColor="#818cf8"
													keyboardAppearance="dark"
												/>
											</View>
										</View>

										<View>
											<Text className="text-xs font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
												Password
											</Text>
											<View className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex-row items-center">
												<MaterialCommunityIcons
													name="lock-outline"
													size={20}
													color="#94a3b8"
												/>
												<TextInput
													className="flex-1 ml-3 text-base text-white"
													placeholder="••••••••"
													placeholderTextColor="#64748b"
													secureTextEntry
													value={password}
													onChangeText={setPassword}
													autoCapitalize="none"
													selectionColor="#818cf8"
													keyboardAppearance="dark"
												/>
											</View>
										</View>

										{/* Submit Button */}
										<PressableScale
											onPress={loading ? undefined : handleSubmit}
											style={{
												height: 50,
												marginTop: 4,
												borderRadius: 14,
												overflow: "hidden",
											}}
										>
											<LinearGradient
												colors={loading ? ["#6366f1", "#4f46e5"] : ["#818cf8", "#4f46e5"]}
												start={{ x: 0, y: 0 }}
												end={{ x: 1, y: 0 }}
												style={{
													height: 50,
													alignItems: "center",
													justifyContent: "center",
													borderRadius: 14,
												}}
											>
												{loading ? (
													<ActivityIndicator color="white" />
												) : (
													<Text className="text-white font-bold text-base tracking-wide">
														{mode === "signIn" ? "Sign In" : "Sign Up"}
													</Text>
												)}
											</LinearGradient>
										</PressableScale>

										{/* Toggle Sign In / Sign Up */}
										<View className="flex-row justify-center">
											<Text className="text-gray-400 text-sm">
												{mode === "signIn"
													? "Don't have an account? "
													: "Already have an account? "}
											</Text>
											<PressableScale
												onPress={() => {
													Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
													setMode(mode === "signIn" ? "signUp" : "signIn");
												}}
											>
												<Text className="text-indigo-400 font-bold text-sm underline">
													{mode === "signIn" ? "Sign Up" : "Sign In"}
												</Text>
											</PressableScale>
										</View>
									</Animated.View>
								)}

								<Text className="text-center text-gray-400">OR</Text>

								{/* 3. Continue as Guest */}
								<PressableScale
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										setHasSeenAuth();
										router.replace("/");
									}}
									style={{
										height: 56,
										// marginTop: 4,
										borderRadius: 16,
										borderWidth: 1,
										borderColor: "rgba(255,255,255,0.1)",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Text className="text-gray-400 font-semibold text-base">
										Continue without Sign In
									</Text>
								</PressableScale>
							</View>
						</View>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
			<View className="flex-row justify-center items-center p-4">
				<Text className="text-gray-500 text-xs">
					By signing up, you agree to our{" "}
				</Text>
				<TouchableOpacity
					onPress={async () =>
						await WebBrowser.openBrowserAsync(
							"https://sites.google.com/view/aurachess-terms-of-service/home",
						)
					}
				>
					<Text className="text-gray-500 text-xs underline">Terms of Service</Text>
				</TouchableOpacity>
				<Text className="text-gray-500 text-xs"> and </Text>
				<TouchableOpacity
					onPress={async () =>
						await WebBrowser.openBrowserAsync(
							"https://sites.google.com/view/aura-chess/home",
						)
					}
				>
					<Text className="text-gray-500 text-xs underline">Privacy Policy</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
