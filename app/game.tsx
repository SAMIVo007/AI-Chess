import React, { useState } from "react";

import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Image,
	Dimensions,
} from "react-native";

import { useRouter } from "expo-router";

import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import Board from "@/components/chess/Board";

import { ThemedView } from "@/components/ThemedView";

const { width } = Dimensions.get("window");

const BOARD_SIZE = width - 32; // leave 16px padding each side

const AVATAR_SIZE = 48;

export default function GameScreen() {
	const router = useRouter();

	const [history, setHistory] = useState<string[]>([
		"e4 e5",

		"Nf3 Nc6",

		"Bb5 a6",

		// ...
	]);

	const [voiceOn, setVoiceOn] = useState(true);

	const [whiteTime, setWhiteTime] = useState(300);

	const [blackTime, setBlackTime] = useState(300);

	const formatTime = (t: number) => {
		const m = Math.floor(t / 60)
			.toString()
			.padStart(2, "0");

		const s = (t % 60).toString().padStart(2, "0");

		return `${m}:${s}`;
	};

	const renderMove = ({ item, index }: { item: string; index: number }) => (
		<View
			className={`px-2 py-1 rounded ${
				index % 2 === 0
					? "bg-gray-100 dark:bg-gray-700"
					: "bg-white dark:bg-gray-800"
			}`}
		>
			<Text className="text-sm text-gray-800 dark:text-gray-200">
				{index + 1}. {item}
			</Text>
		</View>
	);

	return (
		<ThemedView className="p-0 flex-1 bg-gray-50 dark:bg-black">
			{/* Top Bar */}
			<View className="flex-row items-center justify-between px-4 pt-12 pb-4">
				<TouchableOpacity onPress={() => router.back()} className="p-2">
					<MaterialIcons name="arrow-back-ios" size={24} color="#333" />
				</TouchableOpacity>
				<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Current Game
				</Text>
				<TouchableOpacity className="p-2">
					<MaterialIcons name="settings" size={24} color="#333" />
				</TouchableOpacity>
			</View>

			{/* Players & Clocks */}
			<View className="flex-row justify-between px-6 mb-4">
				{/* White Player */}
				<View className="items-center">
					<Image
						source={{
							uri: "https://www.shutterstock.com/image-vector/young-smiling-man-avatar-brown-600nw-2261401207.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						Alice
					</Text>
					<View className="mt-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow">
						<Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
							{formatTime(whiteTime)}
						</Text>
					</View>
				</View>

				{/* Black Player */}
				<View className="items-center">
					<Image
						source={{
							uri: "https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						Bob
					</Text>
					<View className="mt-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow">
						<Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
							{formatTime(blackTime)}
						</Text>
					</View>
				</View>
			</View>

			{/* Chess Board */}
			<View className="flex-1 items-center justify-center">
				<View className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full aspect-square">
					<Board />
				</View>
			</View>

			{/* Move List */}
			<View className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
				<Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
					Moves
				</Text>
				<FlatList
					data={history}
					keyExtractor={(_, i) => String(i)}
					renderItem={renderMove}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingRight: 16 }}
				/>
			</View>

			{/* Bottom Controls */}
			<View className="flex-row justify-around items-center py-3 border-t border-gray-200 dark:border-gray-700">
				<TouchableOpacity onPress={() => setVoiceOn((v) => !v)} className="p-2">
					<FontAwesome5
						name={voiceOn ? "volume-up" : "volume-mute"}
						size={24}
						color={voiceOn ? "#4caf50" : "#999"}
					/>
				</TouchableOpacity>
				<TouchableOpacity className="p-2">
					<MaterialIcons name="undo" size={28} color="#333" />
				</TouchableOpacity>
				<TouchableOpacity className="p-2">
					<MaterialIcons name="flag" size={28} color="#e53935" />
				</TouchableOpacity>
			</View>
		</ThemedView>
	);
}
