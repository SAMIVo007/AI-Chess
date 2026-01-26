import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { fetchUserGames } from "@/api/supabaseAPI";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { PressableScale } from "pressto";
import { Image } from "expo-image";
import { UserBlurhash } from "@/constants/Blurhashes";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";

interface Game {
	id: string;
	created_at: string;
	status: string;
	white_player_id: string;
	black_player_id: string;
	winner_id?: string | null;
}

export default function RecentGamesList() {
	const isDarkMode = useColorScheme() ?? "light";
	const { session } = useAuth();
	const router = useRouter();
	const [games, setGames] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadGames();
	}, []);

	const loadGames = async () => {
		if (session?.user?.id) {
			setLoading(true);
			const data = await fetchUserGames(session.user.id);
			setGames(data);
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const renderGameItem = ({ item }: { item: any }) => {
		const isWhite = item.white_player_id === session?.user?.id;
		const opponent = isWhite ? item.black_player : item.white_player;
		const isVsAI = !item.white_player_id || !item.black_player_id; // Naive check for AI if one side is missing

		// Determining status label & result
		let statusLabel = "Unknown";
		let statusColor = "text-gray-500";
		let statusBg = "bg-gray-100 dark:bg-gray-800";

		if (item.status === "active") {
			statusLabel = "Playing";
			statusColor = "text-indigo-600 dark:text-indigo-400";
			statusBg = "bg-indigo-50 dark:bg-indigo-900/20";
		} else if (item.status === "completed") {
			if (item.winner_id) {
				const iWon = item.winner_id === session?.user?.id;

				if (iWon) {
					statusLabel = "Won";
					statusColor = "text-green-600 dark:text-green-400";
					statusBg = "bg-green-50 dark:bg-green-900/20";
				} else {
					statusLabel = "Lost";
					statusColor = "text-red-600 dark:text-red-400";
					statusBg = "bg-red-50 dark:bg-red-900/20";
				}
			} else {
				// Completed but no winner_id => Draw
				statusLabel = "Draw";
				statusColor = "text-gray-600 dark:text-gray-300";
				statusBg = "bg-gray-100 dark:bg-gray-800";
			}
		} else if (item.status === "waiting") {
			statusLabel = "Waiting";
			statusColor = "text-orange-600 dark:text-orange-400";
			statusBg = "bg-orange-50 dark:bg-orange-900/20";
		}

		return (
			<PressableScale
				onPress={() => {
					// Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
					router.push({
						pathname: "/online-game",
						params: { gameId: item.id, inviteCode: item.invite_code },
					});
				}}
				style={{
					backgroundColor: isDarkMode ? "#1E1E1E" : "white",
					marginBottom: 12,
					borderWidth: 1,
					borderColor: isDarkMode ? "#1f2937" : "#f7fafc",
					borderRadius: 16,
				}}
			>
				<View
					className="p-4 flex-row justify-between items-center overflow-hidden"
					style={{ borderRadius: 16 }}
				>
					<View className="flex-row items-center flex-1">
						{/* Opponent Avatar */}
						<View className="w-12 h-12 rounded-full mr-4 border border-gray-200 dark:border-gray-700 overflow-hidden items-center justify-center">
							{opponent?.avatar_url ? (
								<Image
									source={{ uri: opponent.avatar_url }}
									style={{ width: "100%", height: "100%" }}
									placeholder={{ blurhash: UserBlurhash }}
									transition={500}
								/>
							) : (
								<FontAwesome5
									name={isVsAI ? "robot" : "user"}
									size={20}
									color="#9ca3af"
								/>
							)}
						</View>

						{/* Info */}
						<View className="flex-1 mr-2">
							<Text
								className="text-gray-900 dark:text-white font-bold text-base mb-1"
								numberOfLines={1}
							>
								{item.status === "waiting"
									? "Waiting for Join..."
									: isVsAI
									? "Stockfish AI"
									: opponent?.username || "Anonymous Opponent"}
							</Text>
							<View className="flex-row items-center">
								<View
									className={`w-3 h-3 rounded-full mr-2 border border-gray-300 ${
										item.status === "waiting"
											? "bg-gray-300 dark:bg-gray-600"
											: !!isWhite
											? "bg-white"
											: "bg-black"
									}`}
								/>
								<Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">
									{formatDate(item.created_at)}
								</Text>
							</View>
						</View>
					</View>

					{/* Status Badge */}
					<View className={`px-3 py-1.5 rounded-full ${statusBg}`}>
						<Text className={`text-xs font-bold ${statusColor} capitalize`}>
							{statusLabel}
						</Text>
					</View>
				</View>
			</PressableScale>
		);
	};

	if (loading) {
		return (
			<View className="flex-1 items-center justify-start">
				<LottieView
					autoPlay
					style={{
						width: 400,
						height: 400,
					}}
					source={require("@/assets/lottie/loading_files.json")}
				/>
			</View>
		);
	}

	if (games.length === 0) {
		return (
			<View className="mt-8 py-8 items-center bg-gray-800/50 rounded-3xl border-dashed border-2 border-gray-700">
				<MaterialIcons name="sports-esports" size={48} color="#ccc" />
				<Text className="text-gray-500 mt-2 font-medium">No games played yet</Text>
				<Text className="text-gray-400 text-xs mt-1">
					Start a new game to see it here!
				</Text>
			</View>
		);
	}

	return (
		<View>
			<View className="mt-4 mb-4 flex-row items-center justify-between">
				<Text className="text-xl font-bold text-white">Recent Games</Text>
				<TouchableOpacity
					onPress={() => {
						loadGames();
					}}
				>
					<Text className="text-indigo-600 dark:text-indigo-400 font-semibold">
						Reload
					</Text>
				</TouchableOpacity>
			</View>
			<FlatList
				data={games}
				renderItem={renderGameItem}
				keyExtractor={(item) => item.id}
				scrollEnabled={false}
			/>
		</View>
	);
}
