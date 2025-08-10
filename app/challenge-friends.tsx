import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	FlatList,
	Alert,
	Share,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase";

const { width } = Dimensions.get("window");

interface Friend {
	id: string;
	username: string;
	email: string;
	last_seen: string;
	status: "online" | "offline";
}

interface GameInvite {
	id: string;
	invite_code: string;
	created_at: string;
	expires_at: string;
	status: "pending" | "accepted" | "expired";
}

export default function ChallengeFriends() {
	const router = useRouter();
	const { session } = useAuth();

	const [friends, setFriends] = useState<Friend[]>([]);
	const [gameInvite, setGameInvite] = useState<GameInvite | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingFriends, setLoadingFriends] = useState(true);

	// Mock friends data - replace with actual API call
	useEffect(() => {
		loadFriends();
	}, []);

	const loadFriends = async () => {
		setLoadingFriends(true);
		try {
			// TODO: Replace with actual friends API call
			// For now, using mock data
			const mockFriends: Friend[] = [
				{
					id: "1",
					username: "ChessMaster2024",
					email: "alice@example.com",
					last_seen: "2 min ago",
					status: "online",
				},
				{
					id: "2",
					username: "KnightRider",
					email: "bob@example.com",
					last_seen: "1 hour ago",
					status: "offline",
				},
				{
					id: "3",
					username: "QueenGambit",
					email: "charlie@example.com",
					last_seen: "5 min ago",
					status: "online",
				},
				{
					id: "4",
					username: "PawnStorm",
					email: "diana@example.com",
					last_seen: "3 hours ago",
					status: "offline",
				},
			];
			setFriends(mockFriends);
		} catch (error) {
			console.error("Error loading friends:", error);
		} finally {
			setLoadingFriends(false);
		}
	};

	const generateInviteLink = async () => {
		if (!session?.user?.id) return;

		setLoading(true);
		try {
			// Generate a unique invite code
			const inviteCode = Math.random().toString(36).substring(2, 15);
			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

			// Create a pending game in the database
			const { data: gameData, error: gameError } = await supabase
				.from("games")
				.insert({
					white_player_id: session.user.id,
					black_player_id: null,
					fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
					pgn: "",
					status: "waiting",
					invite_code: inviteCode,
					expires_at: expiresAt.toISOString(),
				})
				.select()
				.single();

			if (gameError) {
				throw gameError;
			}

			const invite: GameInvite = {
				id: gameData.id,
				invite_code: inviteCode,
				created_at: gameData.created_at,
				expires_at: expiresAt.toISOString(),
				status: "pending",
			};

			setGameInvite(invite);

			// Generate shareable link
			const inviteLink = `https://aichess.app/join/${inviteCode}`;

			// Share the link
			await Share.share({
				message: `Join me for a chess game! Click this link to play: ${inviteLink}`,
				title: "Chess Game Invitation",
			});
		} catch (error) {
			console.error("Error generating invite:", error);
			Alert.alert("Error", "Failed to generate invite link. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const sendDirectChallenge = async (
		friendId: string,
		friendUsername: string
	) => {
		if (!session?.user?.id) return;

		try {
			// TODO: Implement direct challenge logic
			// This would create a game and send a push notification to the friend
			Alert.alert(
				"Challenge Sent!",
				`Your challenge has been sent to ${friendUsername}. They will be notified.`,
				[{ text: "OK" }]
			);
		} catch (error) {
			console.error("Error sending challenge:", error);
			Alert.alert("Error", "Failed to send challenge. Please try again.");
		}
	};

	const renderFriendItem = ({ item }: { item: Friend }) => (
		<View className="flex-row items-center justify-between p-4 mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
			<View className="flex-1">
				<View className="flex-row items-center mb-1">
					<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{item.username}
					</Text>
					<View
						className={`ml-2 w-3 h-3 rounded-full ${
							item.status === "online" ? "bg-green-500" : "bg-gray-400"
						}`}
					/>
				</View>
				<Text className="text-sm text-gray-600 dark:text-gray-400">
					Last seen: {item.last_seen}
				</Text>
			</View>

			<TouchableOpacity
				onPress={() => sendDirectChallenge(item.id, item.username)}
				className={`px-4 py-2 rounded-full ${
					item.status === "online" ? "bg-green-600" : "bg-gray-400 dark:bg-gray-600"
				}`}
			>
				<Text className="text-white font-semibold text-sm">
					{item.status === "online" ? "Challenge" : "Offline"}
				</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<ThemedView className="flex-1 px-6 pt-12 bg-white dark:bg-black">
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Generate Link Section */}
				<View className="mb-8">
					<ThemedText className="mb-4 text-lg font-medium">
						Share Game Link
					</ThemedText>
					<Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
						Generate a link to share with anyone. They can join your game by clicking
						the link.
					</Text>

					{gameInvite ? (
						<View className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
							<View className="flex-row items-center mb-2">
								<Feather name="check-circle" size={18} color="#22c55e" />
								<Text className="ml-2 font-semibold text-green-700 dark:text-green-400">
									Invite Link Created!
								</Text>
							</View>
							<Text className="text-sm text-green-600 dark:text-green-300 mb-3">
								Code: {gameInvite.invite_code}
							</Text>
							<TouchableOpacity
								onPress={generateInviteLink}
								className="bg-green-600 rounded-lg py-2"
							>
								<Text className="text-center text-white font-semibold">
									Share Again
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<TouchableOpacity
							onPress={generateInviteLink}
							disabled={loading}
							className={`rounded-xl py-4 ${loading ? "bg-gray-400" : "bg-blue-600"}`}
						>
							<View className="flex-row items-center justify-center">
								{loading ? (
									<MaterialIcons name="hourglass-empty" size={20} color="white" />
								) : (
									<Feather name="link" size={20} color="white" />
								)}
								<Text className="ml-2 text-center text-white font-bold text-lg">
									{loading ? "Generating..." : "Generate Invite Link"}
								</Text>
							</View>
						</TouchableOpacity>
					)}
				</View>

				{/* Friends List Section */}
				<View className="mb-8">
					<View className="flex-row items-center justify-between mb-4">
						<ThemedText className="text-lg font-medium">Challenge Friends</ThemedText>
						<TouchableOpacity
							onPress={loadFriends}
							className="p-2"
							disabled={loadingFriends}
						>
							<MaterialIcons
								name="refresh"
								size={24}
								color={loadingFriends ? "#999" : "#4caf50"}
							/>
						</TouchableOpacity>
					</View>

					{loadingFriends ? (
						<View className="py-8">
							<MaterialIcons
								name="hourglass-empty"
								size={32}
								color="#999"
								style={{ textAlign: "center" }}
							/>
							<Text className="text-center text-gray-500 mt-2">
								Loading friends...
							</Text>
						</View>
					) : friends.length > 0 ? (
						<FlatList
							data={friends}
							renderItem={renderFriendItem}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
							showsVerticalScrollIndicator={false}
						/>
					) : (
						<View className="py-8 items-center">
							<Feather name="users" size={48} color="#ccc" />
							<Text className="text-center text-gray-500 mt-4 text-lg">
								No friends found
							</Text>
							<Text className="text-center text-gray-400 mt-2">
								Add friends to challenge them to games
							</Text>
						</View>
					)}
				</View>

				{/* Add Friends Section */}
				<View className="mb-8">
					<ThemedText className="mb-2 text-lg font-medium">
						Add Friends (Coming Soon)
					</ThemedText>
					<View className="flex-row items-center">
						<Feather name="lock" size={18} color="#999" />
						<Text className="ml-2 text-gray-500">
							Search by username, import from contacts
						</Text>
					</View>
				</View>

				{/* Quick Play Button */}
				<TouchableOpacity
					className="bg-orange-600 rounded-xl py-4 mt-6"
					onPress={() => router.push("/play-options")}
				>
					<View className="flex-row items-center justify-center">
						<MaterialIcons name="flash-on" size={24} color="white" />
						<Text className="ml-2 text-center text-white font-bold text-lg">
							Play vs AI Instead
						</Text>
					</View>
				</TouchableOpacity>
			</ScrollView>
		</ThemedView>
	);
}
