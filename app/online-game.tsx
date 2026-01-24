import React, { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Dimensions,
	Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import GameOverModal, {
	GameEndReason,
	GameResult,
} from "@/components/GameOverModal";
import { WaitingOverlay } from "@/components/WaitingOverlay";
import { CapturedPieces } from "@/components/chess/CapturedPieces";
import { ThemedView } from "@/components/ThemedView";
import { Chess, Move, PieceType, Square as SquareNotation } from "chess.js";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { isGameActive } from "@/api/supabaseAPI";
import { ActivityIndicator } from "react-native";
import ChessBoard, { ChessBoardRef } from "@/components/chess/ChessBoard";
import { Profile } from "@/constants/Types";
import { Image } from "expo-image";
import { UserBlurhash } from "@/constants/Blurhashes";

const { width } = Dimensions.get("window");

const AVATAR_SIZE = 48;

const getDescriptiveMove = (
	game: InstanceType<typeof Chess>,
	uci: string
): string => {
	const from = uci.slice(0, 2) as SquareNotation;
	const to = uci.slice(2, 4) as SquareNotation;
	const promotionChar = uci.length > 4 ? uci.charAt(4) : undefined;
	const promotion =
		promotionChar && ["n", "b", "r", "q"].includes(promotionChar)
			? (promotionChar as "n" | "b" | "r" | "q")
			: undefined;

	// Get piece information before move
	const piece = game.get(from);
	if (!piece) return `Move from ${from.toUpperCase()} to ${to.toUpperCase()}`;

	const pieceNames: Record<string, string> = {
		p: "Pawn",
		n: "Knight",
		b: "Bishop",
		r: "Rook",
		q: "Queen",
		k: "King",
	};

	// Make move temporarily to get full move information
	const moveInfo = game.move({ from, to, promotion });

	if (!moveInfo) {
		return `Invalid move from ${from.toUpperCase()} to ${to.toUpperCase()}`;
	}

	let moveText = "";

	// Handle castling
	if (moveInfo.san === "O-O") {
		moveText = "Black castles kingside";
	} else if (moveInfo.san === "O-O-O") {
		moveText = "Black castles queenside";
	} else {
		const pieceName = pieceNames[moveInfo.piece];

		if (moveInfo.captured) {
			moveText = `${pieceName} captures ${
				pieceNames[moveInfo.captured]
			} at ${to.toUpperCase()}`;
		} else {
			moveText = `${pieceName} moves to ${to.toUpperCase()}`;
		}

		// Add check/checkmate information
		if (moveInfo.san.endsWith("#")) {
			moveText += ", Checkmate!";
		} else if (moveInfo.san.endsWith("+")) {
			moveText += ", check";
		}
	}

	// Undo the move we just made for analysis
	game.undo();

	return moveText;
};

export default function GameScreen() {
	const router = useRouter();
	const { session, profile } = useAuth();
	const { levelSelected, timeSelected, gameId, inviteCode } =
		useLocalSearchParams<{
			levelSelected: string;
			timeSelected: string;
			gameId?: string;
			inviteCode?: string;
		}>();

	// console.log("Game params:", {
	// 	levelSelected,
	// 	timeSelected,
	// 	gameId,
	// 	inviteCode,
	// });

	// Game-over overlay state
	const [gameOver, setGameOver] = useState<{
		over: boolean;
		reason: GameEndReason;
		winner: "w" | "b" | null;
	}>({ over: false, reason: "checkmate", winner: null });
	const [isModalVisible, setIsModalVisible] = useState(false);

	// Captured pieces
	const [capturedByWhite, setCapturedByWhite] = useState<PieceType[]>([]);
	const [capturedByBlack, setCapturedByBlack] = useState<PieceType[]>([]);

	// Online multiplayer state
	const [isPlayerWhite, setIsPlayerWhite] = useState<boolean | null>(null);
	const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
	const [isMyTurn, setIsMyTurn] = useState(false);
	const [status, setStatus] = useState<
		"pending" | "waiting" | "active" | "completed"
	>("pending");

	// Voice toggle (optional)
	const [voiceOn, setVoiceOn] = useState(true);
	const voiceOnRef = useRef(voiceOn);

	// Chess clocks with active player tracking
	const [whiteTime, setWhiteTime] = useState<number | undefined>(
		timeSelected ? parseInt(timeSelected, 10) : 300
	);
	const [blackTime, setBlackTime] = useState<number | undefined>(
		timeSelected ? parseInt(timeSelected, 10) : 300
	);
	const [activePlayer, setActivePlayer] = useState<"w" | "b">("w"); // White starts
	const [gameStarted, setGameStarted] = useState(false);

	// Timer refs for cleanup
	const timerRef = useRef<number | null>(null); // Keep as number for setInterval ID

	const chessBoardRef = useRef<ChessBoardRef>(null);
	const listRef = useRef<FlatList<string>>(null);

	// Keep a local game instance PURELY for logic/history/validation checks
	// (Optional, but good for calculating isMyTurn etc without querying child)
	const [logicGame] = useState(new Chess());

	// Keep voiceOnRef updated with current voiceOn value
	useEffect(() => {
		voiceOnRef.current = voiceOn;
	}, [voiceOn]);

	// Initialize online game and set up real-time subscription
	useEffect(() => {
		if (gameId) {
			initializeOnlineGame();
		}
	}, [gameId]);

	const fetchOpponentProfile = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (data) {
				setOpponentProfile(data);
			}
		} catch (e) {
			console.error("Error fetching profile:", e);
		}
	};

	const initializeOnlineGame = async () => {
		if (!gameId || !session) return;

		try {
			// Fetch game data
			const { data: gameData, error } = await supabase
				.from("games")
				.select("*")
				.eq("id", gameId)
				.single();

			if (error || !gameData) {
				console.error("Error fetching game:", error);
				return;
			}

			// Store status
			setStatus(gameData.status);

			// Identity
			const isWhite = gameData.white_player_id === session.user.id;
			setIsPlayerWhite(isWhite);

			// Fetch opponent profile if they exist
			if (isWhite && gameData.black_player_id) {
				fetchOpponentProfile(gameData.black_player_id);
			} else if (!isWhite && gameData.white_player_id) {
				fetchOpponentProfile(gameData.white_player_id);
			}

			// Load game state if it exists
			if (gameData.fen) {
				logicGame.load(gameData.fen);
				chessBoardRef.current?.reset(gameData.fen);
			}

			// Set turn
			const currentTurn = logicGame.turn();
			// isMyTurn: (I am White AND Turn is White) OR (I am Black AND Turn is Black)
			setIsMyTurn(
				(isWhite && currentTurn === "w") || (!isWhite && currentTurn === "b")
			);
			setActivePlayer(currentTurn as "w" | "b");

			// If game is completed/active, handle start
			if (gameData.status === "active") {
				setGameStarted(true);
			}

			// Realtime Subscription
			console.log(`Subscribing to channel: game-${gameId}`);
			const channel = supabase
				.channel(`game-${gameId}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "games",
						filter: `id=eq.${gameId}`,
					},
					(payload) => {
						console.log("Received Realtime Update:", payload);
						const newData = payload.new;

						// 1. Status Update
						if (newData.status === "active") {
							setStatus("active");
							setGameStarted(true);

							// Fetch opponent info if we don't have it yet (e.g. we created the game)
							if (isWhite && newData.black_player_id) {
								fetchOpponentProfile(newData.black_player_id);
							} else if (!isWhite && newData.white_player_id) {
								fetchOpponentProfile(newData.white_player_id);
							}
						}

						// 2. Handle Moves (Opponent)
						if (newData.fen !== logicGame.fen()) {
							console.log("Opponent moved! Updating board...");
							// Determine the move that just happened
							// We can't easily guess the 'from-to' just from FEN without complex diffing.
							// OPTION A: Just reset the board (Animation snaps, but it works)
							// chessBoardRef.current?.reset(newData.fen);

							// OPTION B: Use PGN history if you are saving it correctly
							// For now, let's use reset to ensure sync, then logicGame update
							logicGame.load(newData.fen);
							chessBoardRef.current?.reset(newData.fen); // Sync visual board

							// Sync Captured Pieces based on FEN diff (approximate) or just re-calculate from history if available
							// Since we don't have full history from just FEN updates easily without PGN,
							// we will try to rely on logicGame state if it has history.
							// However, logicGame.load(fen) CLEARS history.
							// So for online spectator/updates, capturing pieces accurately requires PGN syncing.
							// For MVP, we might miss captures if we just load FEN.
							// TODO: Sync PGN for accurate history.
							// For now, let's just clear captures if we reload FEN, or try to init from PGN if available.
							if (newData.pgn) {
								logicGame.load_pgn(newData.pgn);
								// Now we can get history
								const history = logicGame.history({ verbose: true });
								const w: PieceType[] = [];
								const b: PieceType[] = [];
								history.forEach((m) => {
									if (m.captured) {
										if (m.color === "w") w.push(m.captured);
										else b.push(m.captured);
									}
								});
								setCapturedByWhite(w);
								setCapturedByBlack(b);
							}

							// Update Turn and Active Player
							const turn = logicGame.turn(); // 'w' or 'b'
							const myTurn = (isWhite && turn === "w") || (!isWhite && turn === "b");
							setIsMyTurn(myTurn);
							setActivePlayer(turn as "w" | "b");

							// Check Game Over
							if (logicGame.game_over()) {
								let reason: GameEndReason = "checkmate";
								const winner = logicGame.in_checkmate()
									? logicGame.turn() === "w"
										? "b"
										: "w"
									: null;
								if (logicGame.in_stalemate()) reason = "stalemate";
								else if (logicGame.in_threefold_repetition())
									reason = "threefold_repetition";
								else if (logicGame.insufficient_material())
									reason = "insufficient_material";
								else if (logicGame.in_draw()) reason = "draw";
								setGameOver({ over: true, reason, winner });
								setIsModalVisible(true);
							}
						}
					}
				)
				.subscribe();

			// Cleanup function
			return () => {
				supabase.removeChannel(channel);
			};
		} catch (error) {
			console.error("Error initializing online game:", error);
		}
	};

	// Start/stop timer logic
	useEffect(() => {
		if (!!timeSelected && gameStarted && !gameOver.over) {
			timerRef.current = setInterval(() => {
				if (activePlayer === "w") {
					setWhiteTime((prev = 0) => {
						if (prev <= 1) {
							// White time runs out
							setGameOver({
								over: true,
								reason: "timeout",
								winner: "b",
							});
							setIsModalVisible(true);
							return 0;
						}
						return prev - 1;
					});
				} else {
					setBlackTime((prev = 0) => {
						if (prev <= 1) {
							// Black time runs out
							setGameOver({
								over: true,
								reason: "timeout",
								winner: "w",
							});
							setIsModalVisible(true);
							return 0;
						}
						return prev - 1;
					});
				}
			}, 1000);
		} else {
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [gameStarted, activePlayer, gameOver.over]);

	useEffect(() => {
		if (levelSelected) {
			console.log("AI Difficulty Level (from params):", levelSelected);
		}
		if (!!timeSelected) {
			console.log("Time Control (seconds):", timeSelected);
			const timeInSeconds = parseInt(timeSelected, 10);
			// Only set initial times if the game hasn't started
			// and params are actually available.
			if (!gameStarted && timeInSeconds > 0) {
				setWhiteTime(timeInSeconds);
				setBlackTime(timeInSeconds);
			}
		}
	}, [levelSelected, timeSelected, gameStarted]); // Updated dependencies

	const onMyMove = async (move: Move) => {
		// This callback fires ONLY when WE make a move on the board
		// 1. Update Logic Game
		logicGame.move(move); // Sync local logic
		setIsMyTurn(false); // Immediate lock

		// 2. Send to Supabase
		if (gameId) {
			await supabase
				.from("games")
				.update({
					fen: logicGame.fen(),
					pgn: logicGame.pgn(),
					turn: logicGame.turn(),
					status: logicGame.game_over() ? "completed" : "active",
				})
				.eq("id", gameId);

			// Track captures
			const history = logicGame.history({ verbose: true });
			const w: PieceType[] = [];
			const b: PieceType[] = [];
			history.forEach((m) => {
				if (m.captured) {
					if (m.color === "w") w.push(m.captured);
					else b.push(m.captured);
				}
			});
			setCapturedByWhite(w);
			setCapturedByBlack(b);

			if (logicGame.game_over()) {
				let reason: GameEndReason = "checkmate";
				const winner = logicGame.in_checkmate()
					? logicGame.turn() === "w"
						? "b"
						: "w"
					: null;
				if (logicGame.in_stalemate()) reason = "stalemate";
				else if (logicGame.in_threefold_repetition())
					reason = "threefold_repetition";
				else if (logicGame.insufficient_material())
					reason = "insufficient_material";
				else if (logicGame.in_draw()) reason = "draw";
				setGameOver({ over: true, reason, winner });
				setIsModalVisible(true);
			}
		}
	};

	// const handleUndo = () => {
	// 	// Undo the last move in the chess.js instance
	// 	game.undo(); // User's move
	// 	// If it was AI's turn before user's undo, undo AI's move as well
	// 	if (
	// 		game.history().length > 0 &&
	// 		game.turn() === "b" &&
	// 		activePlayer === "w"
	// 	) {
	// 		game.undo(); // AI's move
	// 	}

	// 	// Update the FEN state to reflect the new board position
	// 	setFen(game.fen());

	// 	// Update the history
	// 	setHistory(game.history());

	// 	// Update the board display
	// 	if (chessRef.current) {
	// 		chessRef.current.resetBoard(game.fen());
	// 	}
	// 	// After undo, it's current turn's player
	// 	setActivePlayer(game.turn() as "w" | "b");
	// 	// If history is empty, game hasn't started
	// 	if (game.history().length === 0) {
	// 		setGameStarted(false);
	// 	}
	// };

	// Format mm:ss

	const formatTime = (t: number) =>
		`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
			2,
			"0"
		)}`;

	// Called by Board when game ends
	const handleGameOver = (reason: GameEndReason, winner: "w" | "b" | null) => {
		setGameOver({ over: true, reason, winner });
	};

	// Rematch → clear history, reset overlay & clocks, bump gameKey
	// const rematch = async () => {
	// 	// Reset game instance
	// 	game.reset();
	// 	setFen(game.fen());
	// 	setHistory([]);

	// 	// Reset game state
	// 	setGameOver({ over: false, resultText: "", winner: null });
	// 	setGameKey((k) => k + 1);
	// 	setGameStarted(false);
	// 	setActivePlayer("w");

	// 	// Reset time based on initial params if available, otherwise default
	// 	const initialTime = timeSelected ? parseInt(timeSelected, 10) : 300;
	// 	setWhiteTime(initialTime);
	// 	setBlackTime(initialTime);

	// 	// Clear any existing timer
	// 	if (timerRef.current) {
	// 		clearInterval(timerRef.current);
	// 		timerRef.current = null;
	// 	}

	// 	// Reset the visual board
	// 	chessRef.current?.resetBoard(game.fen());

	// 	// For online games, update the database
	// 	if (vsAI === "false" && gameId) {
	// 		try {
	// 			const { error } = await supabase
	// 				.from("games")
	// 				.update({
	// 					fen: game.fen(),
	// 					pgn: game.pgn(),
	// 					status: "active",
	// 					turn: "w",
	// 				})
	// 				.eq("id", gameId);

	// 			if (error) {
	// 				console.error("Error resetting online game:", error);
	// 			} else {
	// 				// Reset turn state
	// 				setIsMyTurn(isPlayerWhite === true);
	// 			}
	// 		} catch (error) {
	// 			console.error("Error resetting game:", error);
	// 		}
	// 	}
	// };

	// useEffect(() => {
	// 	if (history.length > 0) {
	// 		listRef.current?.scrollToEnd({ animated: true });
	// 	}
	// }, [history]);

	return (
		<ThemedView className="flex-1 bg-gray-50 dark:bg-black">
			{/* Top Bar */}
			<View className="flex-row items-center justify-between px-4 pt-12 pb-4">
				<TouchableOpacity onPress={() => router.back()} className="p-2">
					<MaterialIcons name="arrow-back-ios" size={24} color="lightgray" />
				</TouchableOpacity>
				<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{!!timeSelected ? "Time Attack" : "Unlimited Time"}
				</Text>
				<TouchableOpacity className="p-2 opacity-0" disabled>
					<MaterialIcons name="settings" size={24} color="lightgray" />
				</TouchableOpacity>
			</View>

			{/* Players & Clocks */}
			<View className="flex-1 justify-center px-4 w-full max-w-[500px] self-center">
				{/* Opponent (Top) */}
				<View className="flex-row items-center justify-between mb-6">
					<View className="flex-row items-center">
						<View className="rounded-full w-14 h-14 mr-3 border border-gray-300 dark:border-gray-600 justify-center items-center overflow-hidden">
							{opponentProfile?.avatar_url ? (
								<Image
									source={{
										uri: opponentProfile?.avatar_url,
									}}
									style={{ width: "100%", height: "100%" }}
									placeholder={{ blurhash: UserBlurhash }}
									contentFit="cover"
									transition={1000}
								/>
							) : (
								<FontAwesome5 name="user" size={22} color="gray" />
							)}
						</View>
						<View>
							<Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
								{opponentProfile?.username || "Opponent"}
							</Text>
							<CapturedPieces
								captured={isPlayerWhite ? capturedByBlack : capturedByWhite}
								color={isPlayerWhite ? "w" : "b"}
							/>
						</View>
					</View>

					<View
						className={`px-3 py-1 rounded-md shadow-sm ${
							activePlayer === "b" && gameStarted && !gameOver.over
								? "bg-gray-800 dark:bg-gray-700 border-b-4 border-gray-600"
								: "bg-gray-200 dark:bg-gray-800"
						}`}
					>
						<Text
							className={`text-lg font-mono font-bold ${
								activePlayer === "b" && gameStarted && !gameOver.over
									? "text-white"
									: "text-gray-600 dark:text-gray-400"
							}`}
						>
							{!!timeSelected ? formatTime(blackTime || 0) : "∞"}
						</Text>
					</View>
				</View>

				{/* Board Area */}
				<View className="items-center justify-center my-2 shadow-lg w-full aspect-square">
					<ChessBoard
						ref={chessBoardRef}
						orientation={isPlayerWhite ? "w" : "b"}
						onMove={onMyMove}
					/>
				</View>

				{/* Player (Bottom) */}
				<View className="flex-row items-center justify-between mt-6">
					<View className="flex-row items-center">
						<View className="rounded-full w-14 h-14 mr-3 border border-gray-300 dark:border-gray-600 justify-center items-center overflow-hidden">
							{profile?.avatar_url ? (
								<Image
									source={{
										uri: profile?.avatar_url,
									}}
									style={{ width: "100%", height: "100%" }}
									placeholder={{ blurhash: UserBlurhash }}
									contentFit="cover"
									transition={1000}
								/>
							) : (
								<FontAwesome5 name="user" size={22} color="gray" />
							)}
						</View>
						<View>
							<Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
								{profile?.username || "Player"}
							</Text>
							<CapturedPieces
								captured={isPlayerWhite ? capturedByWhite : capturedByBlack}
								color={isPlayerWhite ? "b" : "w"}
							/>
						</View>
					</View>

					<View
						className={`px-3 py-1 rounded-md shadow-sm ${
							activePlayer === "w" && gameStarted && !gameOver.over
								? "bg-white dark:bg-gray-200 border-b-4 border-gray-300"
								: "bg-gray-200 dark:bg-gray-800"
						}`}
					>
						<Text
							className={`text-lg font-mono font-bold ${
								activePlayer === "w" && gameStarted && !gameOver.over
									? "text-black"
									: "text-gray-600 dark:text-gray-400"
							}`}
						>
							{!!timeSelected ? formatTime(whiteTime || 0) : "∞"}
						</Text>
					</View>
				</View>
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
			<View className="flex-row justify-around items-center py-3 border-t border-gray-200 dark:border-gray-700">
				<TouchableOpacity className="p-2">
					<MaterialIcons name="flag" size={28} color="#e53935" />
				</TouchableOpacity>
			</View>

			{/* Game Over Overlay */}
			<GameOverModal
				isOpen={isModalVisible}
				result={
					gameOver.winner === null
						? "draw"
						: isPlayerWhite !== null &&
						  gameOver.winner === (isPlayerWhite ? "w" : "b")
						? "win"
						: "loss"
				}
				reason={gameOver.reason}
				playerColor={isPlayerWhite ? "w" : "b"}
				onRematch={() => {
					// Implement rematch logic later
					router.replace("/challenge-friends");
				}}
				onNewGame={() => router.replace("/challenge-friends")}
				onClose={() => setIsModalVisible(false)}
			/>

			{status === "waiting" && (
				<WaitingOverlay inviteCode={inviteCode} onCancel={() => router.back()} />
			)}
		</ThemedView>
	);
}
