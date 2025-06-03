import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Dimensions,
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
		<View className="flex-1 bg-[#0a0f0d]">
			<View className="px-6 pt-14 pb-6">
				<ThemedText
					type="link"
					className="pb-2"
					style={{ fontSize: 14, color: "#9ca3af" }}
				>
					{dayDate}
				</ThemedText>

				<ThemedText type="title" style={{ lineHeight: 30 }}>
					Welcome Back
				</ThemedText>
			</View>

			<View className="flex-row flex-wrap justify-center px-4 pb-6">
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
							route ? "bg-green-600" : "bg-gray-600/20 opacity-50"
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
			headerBackgroundColor={{ dark: "#0a0f0d", light: "#ffffff" }}
		>
			<View className="px-4 mt-6">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-xl font-bold text-white mb-3"
				>
					Recent Games
				</Text>
				<View className="bg-green-900/20 rounded-xl shadow p-4 mb-4">
					<Text className="text-white">Win vs Stockfish Level 3</Text>
					<Text className="text-sm text-gray-300">Played today</Text>
				</View>
			</View>

			<View className="px-4 mt-4 mb-8">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-xl font-bold text-white mb-3"
				>
					Friends
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{["Alice", "Bob", "Charlie"].map((friend, index) => (
						<View
							key={index}
							className="flex-col items-center mr-4 bg-green-900/20 rounded-xl p-8"
						>
							<FontAwesome name="user-circle" size={40} color="#fff" />
							<Text className="mt-2 text-white">{friend}</Text>
						</View>
					))}
				</ScrollView>
			</View>
		</ParallaxScrollView>
	);
}
