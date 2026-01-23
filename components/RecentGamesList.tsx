import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { fetchUserGames } from "@/api/supabaseAPI";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";

interface Game {
	id: string;
	created_at: string;
	status: string;
	white_player_id: string;
	black_player_id: string;
	winner?: string; // We'll need to fetch/determine this if not in DB
}

export default function RecentGamesList() {
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
		// Simple logic: if I am white, opponent is black player (or "AI" if null/AI ID)
		// This needs to be adapted based on how we store "AI" games.
		// For now assuming all fetched games are online/stored ones.

		// Determining status label
		let statusLabel = item.status;
		let statusColor = "text-gray-500";

		if (item.status === "active") {
			statusLabel = "In Progress";
			statusColor = "text-yellow-600";
		} else if (item.status === "completed") {
			statusLabel = "Finished";
			statusColor = "text-blue-600"; // Or green/red if we calculate winner
		} else if (item.status === "waiting") {
			statusLabel = "Waiting for Opponent";
			statusColor = "text-orange-500";
		}

		return (
			<TouchableOpacity
				onPress={() =>
					router.push({ pathname: "/online-game", params: { gameId: item.id } })
				}
				className="bg-white dark:bg-gray-800 p-4 mb-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-row justify-between items-center"
			>
				<View className="flex-row items-center">
					<View
						className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
							isWhite ? "bg-gray-100" : "bg-gray-800"
						}`}
					>
						<FontAwesome5
							name="chess-pawn"
							size={20}
							color={isWhite ? "black" : "white"}
						/>
					</View>
					<View>
						<Text className="text-gray-900 dark:text-gray-100 font-semibold text-base">
							Vs {isWhite ? "Opponent (Black)" : "Opponent (White)"}
						</Text>
						<Text className="text-gray-500 text-xs mt-1">
							{formatDate(item.created_at)}
						</Text>
					</View>
				</View>
				<View>
					<Text className={`text-xs font-medium ${statusColor} capitalize`}>
						{statusLabel}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	if (loading) {
		return (
			<View className="py-8">
				<ActivityIndicator size="small" color="#999" />
			</View>
		);
	}

	if (games.length === 0) {
		return (
			<View className="py-8 items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
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
			<FlatList
				data={games}
				renderItem={renderGameItem}
				keyExtractor={(item) => item.id}
				scrollEnabled={false}
			/>
		</View>
	);
}
