import React, { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Image,
	Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import Chessboard, { ChessboardRef } from "react-native-chessboard";
import { Chess, Square as SquareNotation } from "chess.js";
import { startEngine, analyzePosition, stopEngine } from "@/utils/ai";
import { speakMove } from "@/utils/voice";
import { PieceType } from "chess.js";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { isGameActive } from "@/api/supabaseAPI";
import { ActivityIndicator } from "react-native";

const { width } = Dimensions.get("window");

const AVATAR_SIZE = 48;

// 1) Grab the Chessboard’s props:
type ChessboardProps = ComponentProps<typeof Chessboard>;

// 2) Extract the `info` argument of the `onMove` callback:
type ChessMoveInfo = Parameters<NonNullable<ChessboardProps["onMove"]>>[0];

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
	const { session } = useAuth();
	const { levelSelected, timeSelected, vsAI, gameId } = useLocalSearchParams<{
		levelSelected: string;
		timeSelected: string;
		vsAI: "true" | "false";
		gameId?: string;
	}>();

	console.log("Game params:", { levelSelected, timeSelected, vsAI, gameId });

	const [game] = useState(() => new Chess());
	const [fen, setFen] = useState(game.fen());

	// SAN move history
	const [history, setHistory] = useState<string[]>([]);

	// Force-remount key for rematch
	const [gameKey, setGameKey] = useState(0);

	// Game-over overlay state
	const [gameOver, setGameOver] = useState<{
		over: boolean;
		resultText: string;
		winner: "w" | "b" | null;
	}>({ over: false, resultText: "", winner: null });

	// Online multiplayer state
	const [isPlayerWhite, setIsPlayerWhite] = useState<boolean | null>(null);
	const [opponentName, setOpponentName] = useState<string>("Opponent");
	const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
	const [myAvatar, setMyAvatar] = useState<string | null>(null);
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

	const chessRef = useRef<ChessboardRef>(null);
	const listRef = useRef<FlatList<string>>(null);

	// Keep voiceOnRef updated with current voiceOn value
	useEffect(() => {
		voiceOnRef.current = voiceOn;
	}, [voiceOn]);

	// Initialize online game and set up real-time subscription
	useEffect(() => {
		if (vsAI === "false" && gameId) {
			initializeOnlineGame();
		}
	}, [gameId, vsAI]);

	const fetchProfile = async (userId: string, isMe: boolean) => {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("username, avatar_url")
				.eq("id", userId)
				.single();

			if (data) {
				if (isMe) {
					// We don't usually display our own name specifically besides "You",
					// but if we wanted to: setActivePlayerName...
					if (data.avatar_url) setMyAvatar(data.avatar_url);
				} else {
					setOpponentName(data.username || "Opponent");
					if (data.avatar_url) setOpponentAvatar(data.avatar_url);
				}
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

			// Determine if current user is white or black
			// The creator is usually assigned a side.
			// Check if we are checking waiting or active
			let isWhite = false;
			if (gameData.white_player_id === session.user.id) {
				isWhite = true;
			} else if (gameData.black_player_id === session.user.id) {
				isWhite = false;
			} else {
				// If we are just viewing or it's a new joiner scenario (edge case if navigation happened before DB update?)
				// Assuming standard flow: ID is already in DB.
				// If waiting and I'm the creator...
			}

			setIsPlayerWhite(isWhite);

			// Fetch opponent profile if they exist
			if (isWhite && gameData.black_player_id) {
				fetchProfile(gameData.black_player_id, false);
			} else if (!isWhite && gameData.white_player_id) {
				fetchProfile(gameData.white_player_id, false);
			}

			// Fetch my own avatar
			fetchProfile(session.user.id, true);

			// Load game state if it exists
			if (gameData.fen) {
				game.load(gameData.fen);
				setFen(gameData.fen);
				setHistory(game.history());
			}

			// Set turn
			const currentTurn = game.turn();
			// isMyTurn: (I am White AND Turn is White) OR (I am Black AND Turn is Black)
			setIsMyTurn(
				(isWhite && currentTurn === "w") || (!isWhite && currentTurn === "b")
			);
			setActivePlayer(currentTurn as "w" | "b");

			// If game is completed/active, handle start
			if (gameData.status === "active") {
				setGameStarted(true);
			}

			// Set up real-time subscription
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
						console.log("Game state updated!", payload.new);
						const newData = payload.new;

						// 1. Handle Status Change (Waiting -> Active)
						if (newData.status === "active" && status !== "active") {
							setStatus("active");
							setGameStarted(true);
							// Opponent joined!
							// If I am white, opponent is black
							if (isWhite && newData.black_player_id) {
								fetchProfile(newData.black_player_id, false);
							} else if (!isWhite && newData.white_player_id) {
								fetchProfile(newData.white_player_id, false);
							}
						}

						// 2. Handle Moves (FEN Updates)
						const newFen = newData.fen;
						if (newFen && newFen !== game.fen()) {
							game.load(newFen);
							setFen(newFen);
							setHistory(game.history());

							// Update board visual
							if (chessRef.current) {
								chessRef.current.resetBoard(newFen);
							}

							// Update turn
							const currentTurn = game.turn();
							setIsMyTurn(
								(isWhite && currentTurn === "w") || (!isWhite && currentTurn === "b")
							);
							setActivePlayer(currentTurn as "w" | "b");

							// Check for game over
							if (game.game_over()) {
								let resultText = "";
								if (game.in_checkmate()) {
									const winner = game.turn() === "w" ? "b" : "w";
									resultText = winner === "w" ? "White wins!" : "Black wins!";
									setGameOver({ over: true, resultText, winner });
								} else {
									resultText = "It's a draw!";
									setGameOver({ over: true, resultText, winner: null });
								}
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
								resultText: "Time's up! Black wins!",
								winner: "b",
							});
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
								resultText: "Time's up! White wins!",
								winner: "w",
							});
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

	const onUserMove = async (info: ChessMoveInfo) => {
		const { from, to, promotion } = info.move;

		// For online games, check if it's the player's turn
		if (vsAI === "false" && !isMyTurn) {
			console.log("Not your turn!");
			return;
		}

		// Start the game timer on first move
		if (!gameStarted) {
			setGameStarted(true);
		}

		// Update the game instance with the move
		const moveResult = game.move({
			from: from,
			to: to,
			promotion: promotion || undefined,
		});

		if (!moveResult) {
			console.log("Invalid move");
			return;
		}

		// Update the FEN state
		setFen(game.fen());

		// Update history
		setHistory(game.history());

		const { fen, game_over, in_check, in_checkmate, in_draw, in_stalemate } =
			info.state;

		const activeColor = fen.split(" ")[1]; // "b" or "w"
		console.log("Active color:", activeColor);

		// Switch active player for timer
		setActivePlayer(activeColor as "w" | "b");

		// Handle different game modes
		if (vsAI === "true") {
			// AI Game Logic
			if (!game_over && activeColor === "b") {
				const difficultyLevel = levelSelected ? parseInt(levelSelected, 10) : 1;
				console.log("Requesting AI move with difficulty:", difficultyLevel);
				analyzePosition(info.state.fen, difficultyLevel).catch((error) => {
					console.error("Error requesting AI move:", error);
				});
			}
		} else if (vsAI === "false" && gameId) {
			// Online Multiplayer Logic
			try {
				const { error } = await supabase
					.from("games")
					.update({
						fen: game.fen(),
						pgn: game.pgn(),
						status: game_over ? "completed" : "active",
						turn: game.turn(),
					})
					.eq("id", gameId);

				if (error) {
					console.error("Error updating game:", error);
				} else {
					// Update turn state
					setIsMyTurn(false);
				}
			} catch (error) {
				console.error("Error making online move:", error);
			}
		}

		// Game over logic (same for both modes)
		if (game_over) {
			let resultText = "";
			if (in_checkmate) {
				resultText = activeColor === "w" ? "Black wins!" : "White wins!";
			} else if (in_stalemate || in_draw) {
				resultText = "It's a draw!";
			}
			setGameOver({ over: true, resultText, winner: activeColor as "w" | "b" });
		}
	};

	const handleUndo = () => {
		// Undo the last move in the chess.js instance
		game.undo(); // User's move
		// If it was AI's turn before user's undo, undo AI's move as well
		if (
			game.history().length > 0 &&
			game.turn() === "b" &&
			activePlayer === "w"
		) {
			game.undo(); // AI's move
		}

		// Update the FEN state to reflect the new board position
		setFen(game.fen());

		// Update the history
		setHistory(game.history());

		// Update the board display
		if (chessRef.current) {
			chessRef.current.resetBoard(game.fen());
		}
		// After undo, it's current turn's player
		setActivePlayer(game.turn() as "w" | "b");
		// If history is empty, game hasn't started
		if (game.history().length === 0) {
			setGameStarted(false);
		}
	};

	// Format mm:ss
	const formatTime = (t: number) =>
		`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
			2,
			"0"
		)}`;

	// Called by Board when game ends
	const handleGameOver = (
		resultText: string,

		winner: "w" | "b" | null
	) => {
		setGameOver({ over: true, resultText, winner });
	};

	// Rematch → clear history, reset overlay & clocks, bump gameKey
	const rematch = async () => {
		// Reset game instance
		game.reset();
		setFen(game.fen());
		setHistory([]);

		// Reset game state
		setGameOver({ over: false, resultText: "", winner: null });
		setGameKey((k) => k + 1);
		setGameStarted(false);
		setActivePlayer("w");

		// Reset time based on initial params if available, otherwise default
		const initialTime = timeSelected ? parseInt(timeSelected, 10) : 300;
		setWhiteTime(initialTime);
		setBlackTime(initialTime);

		// Clear any existing timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		// Reset the visual board
		chessRef.current?.resetBoard(game.fen());

		// For online games, update the database
		if (vsAI === "false" && gameId) {
			try {
				const { error } = await supabase
					.from("games")
					.update({
						fen: game.fen(),
						pgn: game.pgn(),
						status: "active",
						turn: "w",
					})
					.eq("id", gameId);

				if (error) {
					console.error("Error resetting online game:", error);
				} else {
					// Reset turn state
					setIsMyTurn(isPlayerWhite === true);
				}
			} catch (error) {
				console.error("Error resetting game:", error);
			}
		}
	};

	// stockfish initialization
	useEffect(() => {
		const initializeGame = async () => {
			const onLine = async (line: string) => {
				console.log("Stockfish →", line);
				if (line.startsWith("bestmove")) {
					const uci = line.split(" ")[1];
					console.log("Received bestmove:", uci);

					if (uci && chessRef.current) {
						// First parse the move
						const from = uci.slice(0, 2) as SquareNotation;
						const to = uci.slice(2, 4) as SquareNotation;
						const promotionChar = uci.length > 4 ? uci.charAt(4) : undefined;
						const promotion =
							promotionChar && ["n", "b", "r", "q"].includes(promotionChar)
								? (promotionChar as "n" | "b" | "r" | "q")
								: undefined;

						// Get move description BEFORE making the move
						const moveDescription = getDescriptiveMove(game, uci);
						console.log("AI Move Description:", moveDescription);

						// Then animate and apply the move
						await chessRef.current.move({ from, to });

						// Also update the game state
						game.move({ from, to, promotion });

						// Update state and switch active player
						setFen(game.fen());
						setHistory(game.history()); // Ensure history is updated
						setActivePlayer("w"); // After AI (black) moves, it's white's turn

						// Voice feedback
						if (voiceOnRef.current) {
							speakMove(moveDescription);
						}
					}
				}
			};

			console.log("Initializing game with Stockfish...");

			// start the engine + listener
			try {
				await startEngine(onLine);
				console.log("Stockfish initialization completed");
			} catch (error) {
				console.error("Failed to initialize Stockfish:", error);
			}
		};

		if (vsAI === "true") {
			initializeGame();
		}

		return () => {
			if (vsAI === "true") {
				console.log("Game component cleanup - stopping engine");
				stopEngine();
			}

			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (history.length > 0) {
			listRef.current?.scrollToEnd({ animated: true });
		}
	}, [history]);

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
				<TouchableOpacity className="p-2">
					<MaterialIcons name="settings" size={24} color="lightgray" />
				</TouchableOpacity>
			</View>

			{/* Players & Clocks */}
			<View className="flex-row justify-between px-12 mt-4">
				{/* White Player */}
				<View className="items-center">
					<Image
						source={{
							uri:
								(isPlayerWhite
									? vsAI === "true"
										? null
										: myAvatar
									: opponentAvatar) ||
								"https://www.shutterstock.com/image-vector/young-smiling-man-avatar-brown-600nw-2261401207.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						{vsAI === "true"
							? "You"
							: isPlayerWhite
							? session?.user.aud
							: opponentName}
					</Text>
					<View
						className={`mt-1 px-3 py-1 rounded-full shadow ${
							activePlayer === "w" && gameStarted && !gameOver.over
								? "bg-green-500"
								: "bg-white dark:bg-gray-800"
						}`}
					>
						<Text
							className={`text-sm font-mono ${
								activePlayer === "w" && gameStarted && !gameOver.over
									? "text-white font-bold"
									: "text-gray-800 dark:text-gray-200"
							}`}
						>
							{!!timeSelected ? formatTime(whiteTime || 0) : "∞"}
						</Text>
					</View>
				</View>

				{/* Black Player */}
				<View className="items-center">
					<Image
						source={{
							uri:
								(isPlayerWhite ? opponentAvatar : vsAI === "true" ? null : myAvatar) ||
								"https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						{vsAI === "true"
							? "AI"
							: isPlayerWhite
							? opponentName
							: session?.user.aud}
					</Text>
					<View
						className={`mt-1 px-3 py-1 rounded-full shadow ${
							activePlayer === "b" && gameStarted && !gameOver.over
								? "bg-green-500"
								: "bg-white dark:bg-gray-800"
						}`}
					>
						<Text
							className={`text-sm font-mono ${
								activePlayer === "b" && gameStarted && !gameOver.over
									? "text-white font-bold"
									: "text-gray-800 dark:text-gray-200"
							}`}
						>
							{!!timeSelected ? formatTime(blackTime || 0) : "∞"}
						</Text>
					</View>
				</View>
			</View>

			{/* Chess Board */}
			<View className="flex-1 items-center justify-center">
				<Chessboard
					ref={chessRef}
					// fen={fen}
					boardSize={width}
					gestureEnabled={vsAI === "true" ? true : isMyTurn}
					onMove={onUserMove}
					durations={{ move: 150 }}
					colors={{
						white: "#f0d9b5",
						black: "#b4855e",
					}}
				/>
			</View>

			{/* Turn Indicator for Online Games */}
			{vsAI === "false" && (
				<View className="py-2 px-4">
					<Text
						className={`text-center text-lg font-semibold ${
							isMyTurn ? "text-green-600" : "text-orange-600"
						}`}
					>
						{isMyTurn ? "Your Turn" : "Opponent's Turn"}
					</Text>
				</View>
			)}

			{/* Move List */}
			<View className="py-2 h-[4.6rem] border-t border-gray-200 dark:border-gray-700">
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
			</View>

			{/* Bottom Controls */}
			<View className="flex-row justify-around items-center py-3 border-t border-gray-200 dark:border-gray-700">
				{vsAI === "true" && (
					<>
						<TouchableOpacity onPress={() => setVoiceOn((v) => !v)} className="p-2">
							<FontAwesome5
								name={voiceOn ? "volume-up" : "volume-mute"}
								size={24}
								color={voiceOn ? "#4caf50" : "#999"}
							/>
						</TouchableOpacity>

						<TouchableOpacity className="p-2" onPress={handleUndo}>
							<MaterialIcons name="undo" size={28} color="lightgray" />
						</TouchableOpacity>
					</>
				)}

				<TouchableOpacity className="p-2">
					<MaterialIcons name="flag" size={28} color="#e53935" />
				</TouchableOpacity>
			</View>

			{/* Game Over Overlay */}
			{gameOver.over && (
				<View className="absolute inset-0 bg-black/70 items-center justify-center p-4 z-10">
					<View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
						<Text className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
							{gameOver.resultText}
						</Text>
						<TouchableOpacity
							onPress={rematch}
							className="bg-blue-600 rounded-md py-3 mb-3"
						>
							<Text className="text-center text-white font-semibold">Rematch</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => router.push("/(tabs)")}
							className="border border-gray-300 rounded-md py-3"
						>
							<Text className="text-center text-gray-700 dark:text-gray-200">
								New Game
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}

			{vsAI === "false" && status === "waiting" && (
				<View className="absolute inset-0 bg-black/80 items-center justify-center p-4 z-20">
					<Text className="text-white text-xl font-bold mb-4">
						Waiting for opponent...
					</Text>
					<ActivityIndicator size="large" color="#fff" />
					<Text className="text-gray-300 mt-4 text-center">
						Share the invite code with a friend to start playing!
					</Text>
				</View>
			)}
		</ThemedView>
	);
}
