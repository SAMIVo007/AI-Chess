import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const BUTTON_WIDTH = (width - 60) / 2; // Two columns with adjusted gap

const HEADER_HEIGHT = 250;

export default function HomeScreen() {
	const router = useRouter();

	const [fontsLoaded] = useFonts({
		"Montserrat-Bold": require("@/assets/fonts/Montserrat-Bold.ttf"),

		"Montserrat-Regular": require("@/assets/fonts/Montserrat-Regular.ttf"),
	});

	if (!fontsLoaded) {
		return null; // or a loading indicator
	}

	const headerImage = (
		<View className="flex-1 bg-gray-900">
			<View className="flex-row flex-wrap justify-center p-4 pt-12">
				{[
					{ icon: "play", label: "Play", route: "/game" },

					{ icon: "code", label: "Practice", route: "/practice" },

					{ icon: "users", label: "Friends", route: "/friends" },

					{ icon: "target", label: "Tactics", route: "/tactics" },
				].map(({ icon, label, route }) => (
					<TouchableOpacity
						key={label}
						onPress={() => route && router.push(route as any)}
						className="bg-white/20 rounded-2xl shadow-lg p-4 mb-5 mx-2"
						style={{ width: BUTTON_WIDTH, height: BUTTON_WIDTH }}
					>
						<View className="flex-1 justify-center items-center">
							<Feather name={icon as any} size={40} color="white" />
							<Text
								style={{ fontFamily: "Montserrat-Regular" }}
								className="mt-2 text-lg font-medium text-white"
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
			headerBackgroundColor={{ dark: "#1f1f1f", light: "#ffffff" }}
		>
			{/* Game History Section */}
			<View className="px-4 mt-4">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3"
				>
					Game History
				</Text>

				{/* Example Game History Item */}
				<View className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4">
					<Text className="text-gray-800 dark:text-gray-200">
						Recent Game vs. OpponentName
					</Text>
					<Text className="text-sm text-gray-600 dark:text-gray-400">
						Result: Win
					</Text>
				</View>

				{/* Add more game history items here */}
			</View>

			{/* Social Section */}
			<View className="px-4 mt-4">
				<Text
					style={{ fontFamily: "Montserrat-Bold" }}
					className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3"
				>
					Friends
				</Text>

				{/* Example Friend Item */}
				<View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4">
					<FontAwesome name="user-circle" size={30} color="#718096" />
					<Text className="ml-3 text-base text-gray-700 dark:text-gray-300">
						Friend Name
					</Text>
				</View>

				{/* Add more friend items here */}
			</View>
		</ParallaxScrollView>
	);
}
