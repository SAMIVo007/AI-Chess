import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import {
	Feather,
	FontAwesome5,
	MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useAuth } from "@/context/AuthContext";
import RecentGamesList from "@/components/RecentGamesList";
import { ActionCard } from "@/components/ActionCard";
import { UserBlurhash } from "@/constants/Blurhashes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { session, profile } = useAuth();
	const [greeting, setGreeting] = useState("");

	useEffect(() => {
		const hour = new Date().getHours();
		if (hour < 12) setGreeting("Good Morning");
		else if (hour < 18) setGreeting("Good Afternoon");
		else setGreeting("Good Evening");
	}, []);

	const headerImage = (
		<View
			className="flex-1 bg-[#121212] px-6 justify-end pb-4"
			style={{ paddingTop: insets.top + 70 }}
		>
			<View className="flex-row items-center justify-between mb-4">
				<View>
					<Text className="text-gray-400 font-medium text-sm uppercase tracking-wider mb-1">
						{greeting}
					</Text>
					<Text className="text-white text-3xl font-bold">
						{profile?.username ||
							profile?.full_name ||
							session?.user?.email?.split("@")[0] ||
							"Chess Master"}
					</Text>
				</View>
				<TouchableOpacity
					className="bg-gray-800 rounded-full border border-gray-700"
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						router.push("/account");
					}}
				>
					<View className="w-14 h-14 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden items-center justify-center">
						{profile?.avatar_url ? (
							<Image
								source={{ uri: profile.avatar_url }}
								style={{ width: "100%", height: "100%" }}
								placeholder={{ blurhash: UserBlurhash }}
								transition={200}
								contentFit="cover"
							/>
						) : (
							<FontAwesome5 name="user" size={20} color="#9ca3af" />
						)}
					</View>
				</TouchableOpacity>
			</View>

			{/* <View className="flex-row items-center bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
				<MaterialCommunityIcons name="trophy-outline" size={24} color="#fbbf24" />
				<View className="ml-3">
					<Text className="text-gray-200 font-semibold">Ready for a challenge?</Text>
					<Text className="text-gray-400 text-xs">Improve your rating today</Text>
				</View>
			</View> */}

			<Text className="text-xl font-bold text-gray-900 dark:text-white mb-5 mt-4">
				Start Playing
			</Text>

			<ActionCard
				title="Play vs AI"
				subtitle="Challenge Stockfish"
				icon="robot"
				color="#4f46e5" // Indigo 600
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
					router.push("/play-options");
				}}
			/>

			<ActionCard
				title="Play Online"
				subtitle="Challenge Friends"
				icon="earth"
				color="#059669" // Emerald 600
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
					router.push("/challenge-friends");
				}}
			/>
		</View>
	);

	return (
		<ParallaxScrollView
			headerImage={headerImage}
			headerBackgroundColor={{ dark: "#121212", light: "#121212" }}
		>
			<View className="flex-1 px-5 rounded-t-[32px] min-h-screen">
				<RecentGamesList />

				{/* Bottom spacer */}
				<View className="h-20" />
			</View>
		</ParallaxScrollView>
	);
}
