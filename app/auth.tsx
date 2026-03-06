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
} from "react-native";
import {
	GoogleSignin,
	statusCodes,
	isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { supabase } from "@/utils/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "pressto";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
	FadeInDown,
	FadeInUp,
	LinearTransition,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

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
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [website, setWebsite] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const [mode, setMode] = useState<"signIn" | "signUp">("signIn");

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
					// website: website,
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
						padding: 24,
					}}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<Animated.View
						entering={FadeInDown.delay(100).springify()}
						layout={LinearTransition.springify()}
						style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}
					>
						{/* Glassmorphism Card */}
						<BlurView
							intensity={50}
							tint="dark"
							style={{
								borderRadius: 24,
								padding: 24,
								overflow: "hidden",
								backgroundColor: "rgba(30, 41, 59, 0.4)", // Slight indigo tint
								borderColor: "rgba(255,255,255,0.1)",
								borderWidth: 1,
							}}
						>
							{/* Header */}
							<View className="items-center mb-8">
								<Animated.View
									entering={FadeInUp.delay(200).springify()}
									className="mb-4 w-20 h-20 bg-indigo-500 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/50"
								>
									<MaterialCommunityIcons name="chess-king" size={40} color="white" />
								</Animated.View>
								<Text className="text-3xl font-bold text-white mb-2 tracking-tight">
									{mode === "signIn" ? "Welcome Back" : "Create Account"}
								</Text>
								<Text className="text-gray-300 text-center font-medium">
									{mode === "signIn"
										? "Sign in to continue your chess journey."
										: "Join the community & checkmate AI."}
								</Text>
							</View>

							{/* Form Fields */}
							<View className="gap-5">
								{mode === "signUp" && (
									<Animated.View
										entering={FadeInDown.springify()}
										exiting={FadeInUp.springify()}
									>
										<View className="">
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
										</View>

										{/* <View>
											<Text className="text-xs font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
												Bio
											</Text>
											<View className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex-row items-center">
												<MaterialCommunityIcons name="web" size={20} color="#94a3b8" />
												<TextInput
													className="flex-1 ml-3 text-base text-white"
													placeholder="A short bio about yourself"
													placeholderTextColor="#64748b"
													autoCapitalize="none"
													value={website}
													onChangeText={setWebsite}
													selectionColor="#818cf8"
												/>
											</View>
										</View> */}
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
										height: 53,
										marginTop: 12,
										borderRadius: 14,
										overflow: "hidden",
									}}
								>
									<LinearGradient
										colors={loading ? ["#6366f1", "#4f46e5"] : ["#818cf8", "#4f46e5"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={{
											height: 53,
											paddingVertical: 14,
											alignItems: "center",
											justifyContent: "center",
											borderRadius: 14,
										}}
									>
										{loading ? (
											<ActivityIndicator color="white" />
										) : (
											<Text className="text-white font-bold text-lg tracking-wide">
												{mode === "signIn" ? "Sign In" : "Sign Up"}
											</Text>
										)}
									</LinearGradient>
								</PressableScale>

								<Text className="text-center text-gray-400">OR</Text>

								{/* Google Sign-In Button */}
								<PressableScale
									onPress={() => {
										if (!googleLoading) {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											signInWithGoogle();
										}
									}}
									style={{
										height: 53,
										borderRadius: 14,
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
											borderRadius: 12,
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<Image
											source={require("@/assets/images/google-logo.svg")}
											style={{ width: 24, height: 24 }}
											contentFit="contain"
										/>
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

								{/* Toggle Mode */}
								<View className="flex-row justify-center mt-4">
									<Text className="text-gray-400">
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
										<Text className="text-indigo-400 font-bold underline">
											{mode === "signIn" ? "Sign Up" : "Sign In"}
										</Text>
									</PressableScale>
								</View>
							</View>
						</BlurView>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
