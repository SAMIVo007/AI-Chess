import React, { useEffect, useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { joinGameByInvite } from "@/api/supabaseAPI";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

export default function JoinGameScreen() {
	const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
	const { session } = useAuth();
	const router = useRouter();
	const [isJoining, setIsJoining] = useState(true);

	useEffect(() => {
		if (!session?.user) {
			Alert.alert("Authentication Required", "Please log in to join this game", [
				{
					text: "Go to Login",
					onPress: () => router.replace("/auth"),
				},
			]);
			return;
		}

		if (inviteCode) {
			handleJoinGame();
		}
	}, [inviteCode, session]);

	const handleJoinGame = async () => {
		if (!session?.user || !inviteCode) return;

		setIsJoining(true);
		try {
			const gameId = await joinGameByInvite(inviteCode, session.user.id);

			if (gameId) {
				Alert.alert("Game Joined! 🎉", "Redirecting to game...", [
					{
						text: "Start Playing",
						onPress: () => {
							router.replace({
								pathname: "/game",
								params: {
									gameId: gameId,
									vsAI: "false",
								},
							});
						},
					},
				]);
			} else {
				Alert.alert(
					"Unable to Join Game",
					"This game may have expired or is no longer available.",
					[
						{
							text: "Go Home",
							onPress: () => router.replace("/(tabs)" ),
						},
					]
				);
			}
		} catch (error) {
			console.error("Error joining game:", error);
			Alert.alert("Error", "Failed to join the game. Please try again.", [
				{
					text: "Go Home",
					onPress: () => router.replace("/(tabs)"),
				},
			]);
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<ThemedView className="flex-1 justify-center items-center p-6">
			{isJoining ? (
				<>
					<ActivityIndicator size="large" color="#4caf50" />
					<ThemedText className="mt-4 text-center text-lg">
						Joining game...
					</ThemedText>
				</>
			) : (
				<ThemedText className="text-center text-lg">
					Processing invite...
				</ThemedText>
			)}
		</ThemedView>
	);
}
