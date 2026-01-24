import React, { useRef, useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { JoinGameModal } from "@/components/JoinGameModal";
import { CreateGameModal } from "@/components/CreateGameModal";

export default function ChallengeFriends() {
	const router = useRouter();
	const [showJoin, setShowJoin] = useState(false);
	const [showCreate, setShowCreate] = useState(false);

	// Join game modal
	const joinBottomSheetRef = useRef<BottomSheet>(null);
	const createBottomSheetRef = useRef<BottomSheet>(null);

	// callbacks
	const handleSheetChanges = useCallback((index: number) => {
		// console.log("handleSheetChanges", index);
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

	return (
		<ThemedView className="flex-1 bg-white dark:bg-[#121212]">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
				className="flex-1"
			>
				{/* Header Section */}
				<View className="pt-16 pb-8 px-6">
					<TouchableOpacity
						onPress={() => router.back()}
						className="mb-6 self-start bg-gray-100 dark:bg-gray-800 p-2 rounded-full"
					>
						<MaterialCommunityIcons name="arrow-left" size={24} color="#666" />
					</TouchableOpacity>
					<Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						Online Chess
					</Text>
					<Text className="text-lg text-gray-500 dark:text-gray-400">
						Play with friends or anyone around the world.
					</Text>
				</View>

				{/* Actions Section */}
				<View className="px-6">
					<ActionCard
						title="Create Game"
						subtitle="Start a new match and invite a friend"
						icon="chess-king"
						color="#ea580c"
						onPress={() => {
							setShowCreate(true);
							createBottomSheetRef.current?.expand();
						}}
					/>

					<ActionCard
						title="Join Game"
						subtitle="Enter a code to join an existing lobby"
						icon="login-variant"
						color="#0891b2"
						onPress={() => {
							setShowJoin(true);
							joinBottomSheetRef.current?.expand();
						}}
					/>
				</View>
			</ScrollView>

			{showJoin && (
				<JoinGameModal
					bottomSheetRef={joinBottomSheetRef}
					handleSheetChanges={handleSheetChanges}
					onClose={() => {
						joinBottomSheetRef.current?.close();
						setShowJoin(false);
					}}
				/>
			)}

			{showCreate && (
				<CreateGameModal
					bottomSheetRef={createBottomSheetRef}
					handleSheetChanges={handleSheetChanges}
					onClose={() => {
						createBottomSheetRef.current?.close();
						setShowCreate(false);
					}}
				/>
			)}
		</ThemedView>
	);
}
