import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useAuth } from "@/context/AuthContext";
import RecentGamesList from "@/components/RecentGamesList";

export default function HomeScreen() {
	const router = useRouter();
	const { session } = useAuth();
	const [greeting, setGreeting] = useState("");

	useEffect(() => {
		const hour = new Date().getHours();
		if (hour < 12) setGreeting("Good Morning");
		else if (hour < 18) setGreeting("Good Afternoon");
		else setGreeting("Good Evening");
	}, []);

	const ActionCard = ({
		title,
		subtitle,
		icon,
		color,
		onPress,
	}: {
		title: string;
		subtitle: string;
		icon: any;
		color: string;
		onPress: () => void;
	}) => (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.9}
			className="mb-4 rounded-3xl overflow-hidden shadow-sm"
			style={{ backgroundColor: color, height: 140 }}
		>
			<View className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
				<MaterialCommunityIcons name={icon} size={120} color="white" />
			</View>
			<View className="p-6 h-full justify-between">
				<View className="bg-white/20 self-start p-3 rounded-2xl">
					<MaterialCommunityIcons name={icon} size={24} color="white" />
				</View>
				<View>
					<Text className="text-white text-2xl font-bold font-sans">{title}</Text>
					<Text className="text-white/80 font-medium">{subtitle}</Text>
				</View>
			</View>
		</TouchableOpacity>
	);

	const headerImage = (
		<View className="flex-1 bg-[#121212] pt-20 px-6 justify-end pb-4">
			<View className="flex-row items-center justify-between mb-4">
				<View>
					<Text className="text-gray-400 font-medium text-sm uppercase tracking-wider mb-1">
						{greeting}
					</Text>
					<Text className="text-white text-3xl font-bold">
						{session?.user?.email?.split("@")[0] || "Chess Master"}
					</Text>
				</View>
				<TouchableOpacity className="bg-gray-800 p-2 rounded-full border border-gray-700">
					<Feather name="bell" size={24} color="#fff" />
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
				onPress={() => router.push("/play-options")}
			/>

			<ActionCard
				title="Play Online"
				subtitle="Challenge Friends"
				icon="earth"
				color="#059669" // Emerald 600
				onPress={() => router.push("/challenge-friends")}
			/>
		</View>
	);

	return (
		<ParallaxScrollView
			headerImage={headerImage}
			headerBackgroundColor={{ dark: "#121212", light: "#121212" }}
		>
			<View className="flex-1 px-5 rounded-t-[32px] min-h-screen">
				<View className="mt-4 mb-4 flex-row items-center justify-between">
					<Text className="text-xl font-bold text-gray-900 dark:text-white">
						Recent Games
					</Text>
					<TouchableOpacity>
						<Text className="text-indigo-600 dark:text-indigo-400 font-semibold">
							See All
						</Text>
					</TouchableOpacity>
				</View>

				<RecentGamesList />

				{/* Bottom spacer */}
				<View className="h-20" />
			</View>
		</ParallaxScrollView>
	);
}
