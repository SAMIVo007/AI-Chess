import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Image,
	Dimensions,
	ScrollView,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { ThemedText } from "@/components/ThemedText";
import ParallaxScrollView from "@/components/ParallaxScrollView";

const { width } = Dimensions.get("window");
const BUTTON_WIDTH = (width - 60) / 2;

export default function HomeScreen() {
	const router = useRouter();
	const [dayDate, setDayDate] = useState("");

	useEffect(() => {
		const today = new Date();
		const date = today.toLocaleString("default", { day: "2-digit" });
		const day = today
			.toLocaleDateString("default", { weekday: "long" })
			.toUpperCase();
		const month = today
			.toLocaleDateString("default", { month: "short" })
			.toUpperCase();
		setDayDate(`${day}, ${month} ${date}`);
	}, []);

	const headerImage = (
		<View className="flex-1">
			<View className="m-8 mt-4 mb-6 flex-row justify-between items-start">
				<View>
					<ThemedText
						type="link"
						className="pb-2"
						style={{ fontSize: 14, color: "#888888" }}
					>
						{dayDate}
					</ThemedText>

					<ThemedText type="title" style={{ lineHeight: 28 }}>
						Welcome Back
					</ThemedText>
				</View>
			</View>

			<View className="flex-row flex-wrap justify-center p-4">
				{[
					{ icon: "cpu", label: "Play vs AI", route: "/play-options" },
					{ icon: "globe", label: "Play Online", route: null },
					{ icon: "users", label: "Pass & Play", route: null },
					{ icon: "bar-chart-2", label: "Stats", route: null },
				].map(({ icon, label, route }) => (
					<TouchableOpacity
						key={label}
						disabled={!route}
						onPress={() => route && router.push(route)}
						className={`rounded-2xl shadow-lg p-4 mb-5 mx-2 ${
							route ? "bg-white/20" : "bg-gray-600/10 opacity-50"
						}`}
						style={{ width: BUTTON_WIDTH, height: BUTTON_WIDTH }}
					>
						<View className="flex-1 justify-center items-center">
							<Feather name={icon as any} size={40} color="white" />
							<Text
								style={{ fontFamily: "Montserrat-Regular" }}
								className="mt-2 text-lg font-medium text-white text-center"
							>
								{label}
							</Text>
						</View>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	return (
		<ParallaxScrollView
			headerImage={headerImage}
		>
			{/* Recent Games */}
			<View className="px-4 mt-6">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3"
				>
					Recent Games
				</Text>
				<View className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4">
					<Text className="text-gray-800 dark:text-gray-200">
						Win vs Stockfish Level 3
					</Text>
					<Text className="text-sm text-gray-600 dark:text-gray-400">
						Played today
					</Text>
				</View>
			</View>

			{/* Friends Section */}
			<View className="px-4 mt-1 mb-8">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3"
				>
					Friends
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{["Alice", "Bob", "Charlie"].map((friend, index) => (
						<View
							key={index}
							className="flex-col items-center mr-4 bg-white/10 rounded-lg p-8"
						>
							<FontAwesome name="user-circle" size={40} color="#ccc" />
							<Text className="mt-2 text-white">{friend}</Text>
						</View>
					))}
				</ScrollView>
			</View>
		</ParallaxScrollView>
	);
}
