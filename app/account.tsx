import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import {
	StyleSheet,
	View,
	Alert,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import { UserBlurhash } from "@/constants/Blurhashes";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as Haptics from "expo-haptics";
import { handleGoBack } from "@/utils/goBackHandler";

export default function Account() {
	const { session } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [username, setUsername] = useState("");
	const [website, setWebsite] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (session) getProfile();
	}, [session]);

	async function getProfile() {
		try {
			setLoading(true);
			if (!session?.user) throw new Error("No user on the session!");

			const { data, error, status } = await supabase
				.from("profiles")
				.select(`username, website, avatar_url`)
				.eq("id", session?.user.id)
				.single();
			if (error && status !== 406) {
				throw error;
			}

			if (data) {
				setUsername(data.username);
				setWebsite(data.website);
				setAvatarUrl(data.avatar_url);
			}
		} catch (error) {
			if (error instanceof Error) {
				Alert.alert(error.message);
			}
		} finally {
			setLoading(false);
		}
	}

	async function updateProfile({
		username,
		website,
		avatar_url,
	}: {
		username: string;
		website: string;
		avatar_url: string;
	}) {
		try {
			setSaving(true);
			if (!session?.user) throw new Error("No user on the session!");

			const updates = {
				id: session?.user.id,
				username,
				website,
				avatar_url,
				updated_at: new Date(),
			};

			const { error } = await supabase.from("profiles").upsert(updates);

			if (error) {
				throw error;
			}
			Alert.alert("Success", "Profile updated successfully!");
		} catch (error) {
			if (error instanceof Error) {
				Alert.alert(error.message);
			}
		} finally {
			setSaving(false);
		}
	}

	async function signOut() {
		try {
			await supabase.auth.signOut();
			await GoogleSignin.signOut();
			router.replace("/auth");
		} catch (error) {
			if (error instanceof Error) {
				Alert.alert(error.message);
			}
		}
	}

	if (loading) {
		return (
			<ThemedView className="flex-1 justify-center items-center">
				<ActivityIndicator size="large" color="#4f46e5" />
			</ThemedView>
		);
	}

	return (
		<ThemedView className="flex-1">
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<ScrollView contentContainerClassName="p-6 pb-20">
					{/* Header */}
					<View className="flex-row items-center justify-between mb-8 mt-12">
						<TouchableOpacity
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								handleGoBack();
							}}
							className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center"
						>
							<MaterialIcons name="arrow-back-ios-new" size={20} color="gray" />
						</TouchableOpacity>
						<ThemedText className="text-xl font-bold">Edit Profile</ThemedText>
						<View className="w-10" />
					</View>

					{/* Avatar Section */}
					<View className="items-center mb-8">
						<View className="relative">
							<View className="w-28 h-28 rounded-full border-4 border-gray-800 overflow-hidden bg-gray-700 items-center justify-center">
								{avatarUrl ? (
									<Image
										source={{ uri: avatarUrl }}
										style={{ width: "100%", height: "100%" }}
										placeholder={{ blurhash: UserBlurhash }}
										contentFit="cover"
										transition={500}
									/>
								) : (
									<FontAwesome5 name="user" size={40} color="#9ca3af" />
								)}
							</View>
							<TouchableOpacity
								className="absolute bottom-0 right-0 bg-indigo-600 w-9 h-9 rounded-full items-center justify-center border-2 border-black"
								onPress={() => {
									Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
									Alert.alert("Coming Soon", "Image upload implementation coming soon!");
								}}
							>
								<MaterialIcons name="camera-alt" size={16} color="white" />
							</TouchableOpacity>
						</View>
						<ThemedText className="mt-4 text-gray-400 text-sm">
							{session?.user?.email}
						</ThemedText>
					</View>

					{/* Form */}
					<View className="space-y-5">
						<View className="mb-2">
							<ThemedText className="text-sm font-medium text-gray-500 mb-2 ml-1">
								Username
							</ThemedText>
							<View className="flex-row items-center bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2">
								<FontAwesome5
									name="user"
									size={16}
									color="#9ca3af"
									style={{ marginRight: 12 }}
								/>
								<TextInput
									className="flex-1 text-base text-gray-100"
									placeholder="Enter your username"
									placeholderTextColor="#9ca3af"
									value={username}
									onChangeText={setUsername}
								/>
							</View>
						</View>

						<View className="mb-2">
							<ThemedText className="text-sm font-medium text-gray-500 mb-2 ml-1">
								Bio
							</ThemedText>
							<View className="flex-row items-center bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2">
								<FontAwesome5
									name="globe"
									size={16}
									color="#9ca3af"
									style={{ marginRight: 12 }}
								/>
								<TextInput
									className="flex-1 text-base text-gray-100"
									placeholder="Tell us about yourself"
									placeholderTextColor="#9ca3af"
									value={website}
									onChangeText={setWebsite}
								/>
							</View>
						</View>
					</View>

					{/* Actions */}
					<View className="mt-4 space-y-4 gap-6">
						<TouchableOpacity
							className="bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-500/30 flex-row justify-center"
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								updateProfile({ username, website, avatar_url: avatarUrl });
							}}
							disabled={saving}
						>
							{saving ? (
								<ActivityIndicator size="small" color="white" className="mr-2" />
							) : null}
							<ThemedText className="text-white font-bold text-lg">
								{saving ? "Saving..." : "Save Changes"}
							</ThemedText>
						</TouchableOpacity>

						<TouchableOpacity
							className="bg-red-900/20 py-4 rounded-2xl items-center border border-red-900/30"
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								signOut();
							}}
						>
							<ThemedText className="text-red-400 font-semibold text-base">
								Sign Out
							</ThemedText>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}
