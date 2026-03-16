import { supabase } from "@/utils/supabase";

const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface CreateInviteOptions {
	/** Hours until invite expires (default 24) */
	expiresInHours?: number;
	/** Preferred starting color for the creator. If 'random', assignment is random. */
	colorPreference?: "white" | "black" | "random";
	/** Optional initial FEN (defaults to standard) */
	fen?: string;
	/** Optional time control in seconds (store if you later add column) */
	timeControlSeconds?: number;
}

export interface CreateInviteResult {
	gameId: string;
	inviteCode: string;
	playerColor: "white" | "black";
	expiresAt: string;
}

export const fetchUserGames = async (userId: string) => {
	const { data, error } = await supabase
		.from("games")
		.select(
			`
			*,
			white_player:profiles!white_player_id(username, full_name, avatar_url),
			black_player:profiles!black_player_id(username, full_name, avatar_url)
		`,
		)
		.or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching user games:", error);
		return [];
	}

	return data || [];
};

// Add this cleanup function
export const cleanupExpiredGames = async () => {
	try {
		const { data, error } = (await supabase
			.from("games")
			.delete()
			.eq("status", "waiting")
			// .is("black_player_id", null)
			.lt("expires_at", new Date().toISOString())) as {
			data: any[] | null;
			error: any;
		};

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

// Enhanced createGameWithInvite with options & robust unique code handling
export const createGameWithInvite = async (
	userId: string,
	options: CreateInviteOptions = {},
): Promise<CreateInviteResult | null> => {
	await cleanupExpiredGames();

	const {
		expiresInHours = 24,
		colorPreference = "white",
		fen = initialFen,
	} = options;

	// Decide player color
	let creatorColor: "white" | "black";
	if (colorPreference === "random") {
		creatorColor = Math.random() < 0.5 ? "white" : "black";
	} else {
		creatorColor = colorPreference;
	}

	const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

	// Attempt to insert with a unique invite_code (loop on collisions)
	for (let attempt = 0; attempt < 5; attempt++) {
		const inviteCode = Math.random().toString(36).slice(2, 10); // 8 chars
		try {
			const insertPayload: any = {
				status: "waiting",
				fen,
				pgn: "",
				turn: "w",
				invite_code: inviteCode,
				expires_at: expiresAt.toISOString(),
			};

			if (creatorColor === "white") {
				insertPayload.white_player_id = userId;
				insertPayload.black_player_id = null;
			} else {
				insertPayload.black_player_id = userId;
				insertPayload.white_player_id = null;
			}

			const { data, error } = await supabase
				.from("games")
				.insert(insertPayload)
				.select()
				.single();

			if (error) {
				// Unique violation code in Postgres is 23505
				if (error.code === "23505") {
					console.warn("Invite code collision, retrying...");
					continue; // try again
				}
				console.error("Error creating game with invite:", error);
				return null;
			}

			return {
				gameId: data.id,
				inviteCode,
				playerColor: creatorColor,
				expiresAt: expiresAt.toISOString(),
			};
		} catch (e) {
			console.error("Unexpected error creating invite (attempt", attempt, ")", e);
		}
	}

	console.error("Failed to generate unique invite code after retries");
	return null;
};

/** Look up a game by invite code regardless of status (for deep link handling) */
export const findGameByInvite = async (inviteCode: string) => {
	const { data, error } = await supabase
		.from("games")
		.select("*")
		.eq("invite_code", inviteCode)
		.single();

	if (error || !data) {
		console.error("Game not found for invite code:", error);
		return null;
	}

	return data;
};

export const joinGameByInvite = async (inviteCode: string, userId: string) => {
	await cleanupExpiredGames();

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

	// Prevent joining own waiting side (already assigned on that color)
	if (
		gameData.white_player_id === userId ||
		gameData.black_player_id === userId
	) {
		console.error("Cannot join a game you created");
		return null;
	}

	// Determine which side is open
	let update: Record<string, any> | null = null;
	if (!gameData.white_player_id && gameData.black_player_id) {
		update = { white_player_id: userId, status: "active" };
	} else if (!gameData.black_player_id && gameData.white_player_id) {
		update = { black_player_id: userId, status: "active" };
	} else {
		console.error("Game already has two players or invalid state");
		return null;
	}

	const { error: updateError } = await supabase
		.from("games")
		.update(update)
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

export const isGameActive = async (gameId: string) => {
	const { data: gameData, error } = await supabase
		.from("games")
		.select("*")
		.eq("id", gameId)
		.eq("status", "active")
		.single();

	if (error || !gameData) {
		console.error("Game not found or not active:", error);
		return false;
	}

	return true;
};
