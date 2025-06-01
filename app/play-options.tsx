import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Dimensions,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function PlayOptions() {
	const [difficulty, setDifficulty] = useState(1); // 0-20
	const [timeControl, setTimeControl] = useState(300); // seconds

	const timeOptions = [60, 180, 300, 600, 900];

	return (
		<ThemedView className="flex-1 px-6 pt-12 bg-white dark:bg-black">
			<ScrollView showsVerticalScrollIndicator={false}>
				<ThemedText type="title" className="text-center mb-6">
					Game Settings
				</ThemedText>

				{/* Difficulty Setting */}
				<View className="mb-8">
					<ThemedText className="mb-2 text-lg font-medium">
						AI Difficulty: {difficulty}
					</ThemedText>
					<Slider
						style={{ width: width - 48, height: 40 }}
						minimumValue={0}
						maximumValue={20}
						step={1}
						value={difficulty}
						minimumTrackTintColor="#4caf50"
						maximumTrackTintColor="#ccc"
						onValueChange={setDifficulty}
					/>
					<Text className="text-sm text-gray-500 mt-1">
						0 (Very Easy) → 20 (Very Hard)
					</Text>
				</View>

				{/* Time Control */}
				<View className="mb-8">
					<ThemedText className="mb-2 text-lg font-medium">Time Control</ThemedText>
					<View className="flex-row flex-wrap gap-3">
						{timeOptions.map((sec) => (
							<TouchableOpacity
								key={sec}
								onPress={() => setTimeControl(sec)}
								className={`px-4 py-2 rounded-full ${
									timeControl === sec ? "bg-green-600" : "bg-gray-300 dark:bg-gray-700"
								}`}
							>
								<Text
									className={`text-white font-semibold ${
										timeControl === sec ? "" : "text-gray-800 dark:text-gray-200"
									}`}
								>
									{sec / 60} min
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Future Features Placeholder */}
				<View className="mb-8">
					<ThemedText className="mb-2 text-lg font-medium">
						Additional Options (Coming Soon)
					</ThemedText>
					<View className="flex-row items-center">
						<Feather name="lock" size={18} color="#999" />
						<Text className="ml-2 text-gray-500">Game mode, themes, sounds</Text>
					</View>
				</View>

				{/* Start Game Button */}
				<TouchableOpacity className="bg-green-600 rounded-xl py-4 mt-6">
					<Text className="text-center text-white font-bold text-lg">
						Start Game
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</ThemedView>
	);
}
