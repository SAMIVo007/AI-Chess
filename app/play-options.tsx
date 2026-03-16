import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	Switch,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableScale } from "pressto";
import * as Haptics from "expo-haptics";
import { handleGoBack } from "@/utils/goBackHandler";

const { width } = Dimensions.get("window");

export default function PlayOptions() {
	const router = useRouter();

	const [difficulty, setDifficulty] = useState(10); // 0-20
	const [playerColor, setPlayerColor] = useState<"w" | "b">("w"); // default White
	const [allowUndo, setAllowUndo] = useState(true);

	const getDifficultyLabel = (level: number) => {
		if (level <= 5) return "Beginner";
		if (level <= 10) return "Intermediate";
		if (level <= 15) return "Advanced";
		return "Master";
	};

	return (
		<ThemedView className="flex-1 bg-[#121212]">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
				className="flex-1"
			>
				{/* Header Section */}
				<View className="pt-16 pb-8 px-6">
					<TouchableOpacity
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							handleGoBack();
						}}
						className="mb-6 self-start bg-gray-800 p-2 rounded-full"
					>
						<MaterialCommunityIcons name="arrow-left" size={24} color="#666" />
					</TouchableOpacity>
					<Text className="text-4xl font-bold text-white mb-2">Play vs AI</Text>
					<Text className="text-lg text-gray-400">
						Configure your game and challenge Stockfish.
					</Text>
				</View>

				{/* Settings Section */}
				<View className="px-6">
					{/* Difficulty Setting */}
					<View className="mb-4 bg-gray-800/50 p-5 rounded-2xl">
						<View className="flex-row items-center justify-between mb-4">
							<View className="flex-row items-center">
								<View className="bg-indigo-900/50 p-2 rounded-xl mr-3">
									<MaterialCommunityIcons name="speedometer" size={24} color="#6366f1" />
								</View>
								<View>
									<Text className="text-lg font-semibold text-white">AI Difficulty</Text>
									<Text className="text-sm text-gray-400">
										Level {difficulty} • {getDifficultyLabel(difficulty)}
									</Text>
								</View>
							</View>
						</View>
						<Slider
							style={{ width: "100%", height: 40 }}
							minimumValue={0}
							maximumValue={20}
							step={1}
							value={difficulty}
							minimumTrackTintColor="#6366f1"
							maximumTrackTintColor="#374151"
							thumbTintColor="#6366f1"
							onValueChange={setDifficulty}
						/>
						<View className="flex-row justify-between mt-1">
							<Text className="text-xs text-gray-400">Easy</Text>
							<Text className="text-xs text-gray-400">Hard</Text>
						</View>
					</View>

					{/* Allow Undo Option */}
					<View className="mb-4 bg-gray-800/50 p-5 rounded-2xl flex-row items-center justify-between">
						<View className="flex-row items-center">
							<View className="bg-orange-900/50 p-2 rounded-xl mr-3">
								<MaterialCommunityIcons name="undo" size={24} color="#f97316" />
							</View>
							<View>
								<Text className="text-lg font-semibold text-white">Allow Undo</Text>
								<Text className="text-sm text-gray-400">Enable taking back moves</Text>
							</View>
						</View>
						<Switch
							value={allowUndo}
							onValueChange={(val) => {
								Haptics.selectionAsync();
								setAllowUndo(val);
							}}
							trackColor={{ false: "#767577", true: "#818cf8" }}
							thumbColor={allowUndo ? "#4f46e5" : "#f4f3f4"}
						/>
					</View>

					{/* Player Color Selection */}
					<View className="mb-4">
						<Text className="text-lg font-semibold text-white mb-4">Play As</Text>
						<View className="flex-row gap-4">
							<TouchableOpacity
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setPlayerColor("w");
								}}
								className={`flex-1 items-center py-5 rounded-2xl border-2 ${
									playerColor === "w"
										? "bg-gray-800 border-indigo-500"
										: "bg-gray-800/50 border-transparent"
								}`}
							>
								<View
									className={`w-12 h-12 rounded-full bg-white border-2 mb-3 items-center justify-center ${
										playerColor === "w" ? "border-indigo-500" : "border-gray-300"
									}`}
								>
									<FontAwesome5
										name="chess-king"
										size={20}
										color={playerColor === "w" ? "#6366f1" : "#9ca3af"}
									/>
								</View>
								<Text
									className={`font-semibold ${
										playerColor === "w" ? "text-indigo-400" : "text-gray-400"
									}`}
								>
									White
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setPlayerColor("b");
								}}
								className={`flex-1 items-center py-5 rounded-2xl border-2 ${
									playerColor === "b"
										? "bg-gray-700 border-indigo-500"
										: "bg-gray-800/50 border-transparent"
								}`}
							>
								<View
									className={`w-12 h-12 rounded-full bg-gray-900 border-2 mb-3 items-center justify-center ${
										playerColor === "b" ? "border-indigo-500" : "border-gray-600"
									}`}
								>
									<FontAwesome5
										name="chess-king"
										size={20}
										color={playerColor === "b" ? "#818cf8" : "#6b7280"}
									/>
								</View>
								<Text
									className={`font-semibold ${
										playerColor === "b" ? "text-indigo-400" : "text-gray-400"
									}`}
								>
									Black
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Start Game Button */}
					<PressableScale
						style={{
							backgroundColor: "#4f46e5",
							marginTop: 16,
							paddingVertical: 16,
							borderRadius: 12,
						}}
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
							router.push({
								pathname: "/offline-game",
								params: {
									levelSelected: difficulty,
									playerColor: playerColor,
									allowUndo: allowUndo ? "true" : "false",
								},
							});
						}}
					>
						<View className="flex-row items-center justify-center">
							<MaterialCommunityIcons name="play" size={24} color="white" />
							<Text className="ml-2 text-center text-white font-bold text-lg">
								Start Game
							</Text>
						</View>
					</PressableScale>
				</View>
			</ScrollView>
		</ThemedView>
	);
}
