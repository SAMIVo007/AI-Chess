import { supabase } from "@/utils/supabase";

const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Add this cleanup function
export const cleanupExpiredGames = async () => {
	try {
		const { data, error } = await supabase
			.from("games")
			.delete()
			.eq("status", "waiting")
			.is("black_player_id", null)
			.lt("expires_at", new Date().toISOString()) as { data: any[] | null, error: any };

		if (error) {
			console.error("Error cleaning up expired games:", error);
			return 0;
		}

		console.log(`Cleaned up ${data?.length || 0} expired games`);
		return data?.length || 0;
	} catch (error) {
		console.error("Cleanup function error:", error);
		return 0;
	}
};

export const createNewGame = async (userId: string) => {
	// Clean up expired games when creating new ones
	await cleanupExpiredGames();

	const { data, error } = await supabase
		.from("games")
		.insert({
			white_player_id: userId,
			status: "pending",
			fen: initialFen,
			pgn: "",
			turn: "w",
		})
		.select()
		.single();

	if (error) {
		console.error("Error creating game:", error);
		return null;
	}

	return data.id;
};

export const createGameWithInvite = async (userId: string) => {
	// Clean up expired games when creating new invites
	await cleanupExpiredGames();

	const inviteCode = Math.random().toString(36).substring(2, 15);
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

	const { data, error } = await supabase
		.from("games")
		.insert({
			white_player_id: userId,
			status: "waiting",
			fen: initialFen,
			pgn: "",
			turn: "w",
			invite_code: inviteCode,
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (error) {
		console.error("Error creating game with invite:", error);
		return null;
	}

	return {
		gameId: data.id,
		inviteCode: inviteCode,
	};
};

export const joinGameByInvite = async (inviteCode: string, userId: string) => {
	// Clean up expired games before attempting to join
	await cleanupExpiredGames();

	// First, find the game by invite code
	const { data: gameData, error: findError } = await supabase
		.from("games")
		.select("*")
		.eq("invite_code", inviteCode)
		.eq("status", "waiting")
		.gt("expires_at", new Date().toISOString())
		.single();

	if (findError || !gameData) {
		console.error("Game not found or expired:", findError);
		return null;
	}

	// Check if user is trying to join their own game
	if (gameData.white_player_id === userId) {
		console.error("Cannot join your own game");
		return null;
	}

	// Update the game to add the second player
	const { error: updateError } = await supabase
		.from("games")
		.update({
			black_player_id: userId,
			status: "active",
		})
		.eq("id", gameData.id);

	if (updateError) {
		console.error("Error joining game:", updateError);
		return null;
	}

	return gameData.id;
};

export const joinGame = async (gameId: string, userId: string) => {
	const { error } = await supabase
		.from("games")
		.update({
			black_player_id: userId,
			status: "active",
		})
		.eq("id", gameId);

	if (error) {
		console.error("Error joining game:", error);
		return false;
	}

	return true;
};
