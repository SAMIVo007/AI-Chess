import React, { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Image,
	Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { Chess, PieceColor, Square as SquareNotation } from "chess.js";
import { startEngine, analyzePosition, stopEngine } from "@/utils/ai";
import { speakMove } from "@/utils/voice";
import { PieceType } from "chess.js";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { isGameActive } from "@/api/supabaseAPI";
import { ActivityIndicator } from "react-native";
import ChessBoard from "@/components/chess/ChessBoard";

const { width } = Dimensions.get("window");

const AVATAR_SIZE = 48;

const pieceNames: Record<string, string> = {
	p: "Pawn",
	n: "Knight",
	b: "Bishop",
	r: "Rook",
	q: "Queen",
	k: "King",
};

export default function GameScreen() {
	const router = useRouter();
	const { session } = useAuth();
	const { levelSelected, timeSelected, vsAI } = useLocalSearchParams<{
		levelSelected: string;
		timeSelected: string;
		vsAI: "true" | "false";
	}>();
	const [orientation, setOrientation] = useState<PieceColor>("w");

	console.log("New Game params:", { levelSelected, timeSelected, vsAI });

	return (
		<ThemedView className="flex-1 bg-gray-50 dark:bg-black">
			{/* Top Bar */}
			<View className="flex-row items-center justify-between px-4 pt-12 pb-4">
				<TouchableOpacity onPress={() => router.back()} className="p-2">
					<MaterialIcons name="arrow-back-ios" size={24} color="lightgray" />
				</TouchableOpacity>
				{/* <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{!!timeSelected ? "Time Attack" : "Unlimited Time"}
				</Text> */}
				<TouchableOpacity className="p-2">
					<MaterialIcons name="settings" size={24} color="lightgray" />
				</TouchableOpacity>
			</View>

			{/* Chess Board */}
			<View className="flex-1 items-center justify-center">
				<ChessBoard orientation={orientation} />
			</View>

			{/* Move List */}
			{/* <View className="py-2 h-[4.6rem] border-t border-gray-200 dark:border-gray-700">
				<Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-4">
					Moves
				</Text>
				<FlatList
					ref={listRef}
					data={history}
					horizontal
					renderItem={({ item, index }) => (
						<View
							key={index}
							className={`px-2 py-1 rounded ${
								index % 2 === 0
									? "bg-gray-100 dark:bg-gray-700"
									: "bg-white dark:bg-gray-800"
							} mr-2`}
						>
							<Text className="text-sm text-gray-800 dark:text-gray-200">
								{index + 1}. {item}
							</Text>
						</View>
					)}
					contentContainerClassName="px-4"
					keyExtractor={(_, i) => String(i)}
					showsHorizontalScrollIndicator={false}
					onContentSizeChange={() =>
						listRef.current?.scrollToEnd({ animated: true })
					}
					getItemLayout={
						(data, index) =>
							// Assuming each item has roughly the same width for horizontal list
							// You'll need to estimate or calculate itemWidth + marginRight
							({ length: 100, offset: 100 * index, index }) // Replace 100 with actual item width + margin
					}
				/>
			</View> */}

			{/* Bottom Controls */}
			{/* <View className="flex-row justify-around items-center py-3 border-t border-gray-200 dark:border-gray-700">
				{vsAI === "true" && (
					<>
						<TouchableOpacity onPress={() => setVoiceOn((v) => !v)} className="p-2">
							<FontAwesome5
								name={voiceOn ? "volume-up" : "volume-mute"}
								size={24}
								color={voiceOn ? "#4caf50" : "#999"}
							/>
						</TouchableOpacity>

						<TouchableOpacity className="p-2" onPress={handleUndo}>
							<MaterialIcons name="undo" size={28} color="lightgray" />
						</TouchableOpacity>
					</>
				)}

				<TouchableOpacity className="p-2">
					<MaterialIcons name="flag" size={28} color="#e53935" />
				</TouchableOpacity>
			</View> */}

			{/* Game Over Overlay */}
			{/* {gameOver.over && (
				<View className="absolute inset-0 bg-black/70 items-center justify-center p-4 z-10">
					<View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
						<Text className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
							{gameOver.resultText}
						</Text>
						<TouchableOpacity
							onPress={rematch}
							className="bg-blue-600 rounded-md py-3 mb-3"
						>
							<Text className="text-center text-white font-semibold">Rematch</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => router.push("/(tabs)")}
							className="border border-gray-300 rounded-md py-3"
						>
							<Text className="text-center text-gray-700 dark:text-gray-200">
								New Game
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)} */}
		</ThemedView>
	);
}
