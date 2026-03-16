import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { findGameByInvite, joinGameByInvite } from "@/api/supabaseAPI";

/**
 * Deep link handler route: https://aurachess.in/join/[code]
 * Shows a loading spinner while processing the invite link.
 * This prevents the +not-found screen from flashing.
 */
export default function JoinByLink() {
	const { code } = useLocalSearchParams<{ code: string }>();
	const { session, loading: authLoading } = useAuth();
	const router = useRouter();
	const [status, setStatus] = useState("Connecting...");

	useEffect(() => {
		if (authLoading) return; // Wait for auth to resolve

		const handleJoin = async () => {
			if (!code) {
				Alert.alert("Invalid Link", "No invite code found in this link.");
				router.replace("/");
				return;
			}

			if (!session?.user?.id) {
				Alert.alert("Login Required", "Please log in to join this game.");
				router.replace("/auth");
				return;
			}

			try {
				const userId = session.user.id;
				setStatus("Finding game...");

				const game = await findGameByInvite(code);

				if (!game) {
					Alert.alert(
						"Game Not Found",
						"This invite link is invalid or the game no longer exists.",
					);
					router.replace("/");
					return;
				}

				// User is already a player — re-enter the game
				if (game.white_player_id === userId || game.black_player_id === userId) {
					router.replace({ pathname: "/online-game", params: { gameId: game.id } });
					return;
				}

				// Game is waiting — join it
				if (game.status === "waiting") {
					setStatus("Joining game...");
					const gameId = await joinGameByInvite(code, userId);
					if (gameId) {
						router.replace({ pathname: "/online-game", params: { gameId } });
					} else {
						Alert.alert("Unable to Join", "Could not join this game. It may have expired.");
						router.replace("/challenge-friends");
					}
				} else {
					// Game is active/completed and user is not a player
					Alert.alert("Cannot Join", "This game is already in progress or has ended.");
					router.replace("/challenge-friends");
				}
			} catch (e) {
				console.error("[JoinByLink] Error:", e);
				Alert.alert("Error", "Could not process this invite. Please try again.");
				router.replace("/");
			}
		};

		handleJoin();
	}, [code, session, authLoading]);

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: "#121212",
				justifyContent: "center",
				alignItems: "center",
				gap: 16,
			}}
		>
			<ActivityIndicator size="large" color="#818cf8" />
			<Text style={{ color: "#9ca3af", fontSize: 16 }}>{status}</Text>
		</View>
	);
}
