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
import { Chess, Move, Square as SquareNotation } from "chess.js";
import { startEngine, analyzePosition, stopEngine } from "@/utils/ai";
import { speakMove } from "@/utils/voice";
import { PieceType } from "chess.js";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { isGameActive } from "@/api/supabaseAPI";
import { ActivityIndicator } from "react-native";
import ChessBoard, { ChessBoardRef } from "@/components/chess/ChessBoard";
import GameOverModal from "@/components/GameOverModal";

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
	const { session } = useAuth();
	const { levelSelected, timeSelected, playerColor } = useLocalSearchParams<{
		levelSelected: string;
		timeSelected: string;
		playerColor?: "w" | "b";
	}>();

	console.log("Game params:", { levelSelected, timeSelected, playerColor });

	// Game-over overlay state
	const [gameOver, setGameOver] = useState<{
		over: boolean;
		resultText: string;
		winner: "w" | "b" | null;
	}>({ over: false, resultText: "", winner: null });
	const [isModalVisible, setIsModalVisible] = useState(false);

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
	const [isMyTurn, setIsMyTurn] = useState(false);
	const [isPlayerWhite, setIsPlayerWhite] = useState<boolean>(
		playerColor === "b" ? false : true // default to true (White) if undefined
	);

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

	const onMyMove = async (move: Move) => {
		// This callback fires ONLY when WE make a move on the board
		// 1. Update Logic Game
		logicGame.move(move); // Sync local logic
		setIsMyTurn(false); // Immediate lock

		// 2. Trigger AI response
		if (!checkGameOver()) {
			const level = levelSelected ? parseInt(levelSelected, 10) : 5;
			await analyzePosition(logicGame.fen(), level);
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

	const checkGameOver = () => {
		if (logicGame.game_over()) {
			let resultText = "Game Over";
			let winner: "w" | "b" | null = null;
			let isDraw = false;

			if (logicGame.in_checkmate()) {
				// The player whose turn it is is checkmated, so the OTHER player wins
				winner = logicGame.turn() === "w" ? "b" : "w";
				resultText = "win";
			} else if (
				logicGame.in_draw() ||
				logicGame.in_stalemate() ||
				logicGame.in_threefold_repetition() ||
				logicGame.insufficient_material()
			) {
				isDraw = true;
				resultText = "draw";
			}

			setGameOver({ over: true, resultText, winner });
			setIsModalVisible(true);
			return true;
		}
		return false;
	};

	// stockfish initialization
	useEffect(() => {
		const initializeGame = async () => {
			const onLine = async (line: string) => {
				console.log("Stockfish →", line);
				if (line.startsWith("bestmove")) {
					const uci = line.split(" ")[1];
					console.log("Received bestmove:", uci);

					if (uci && chessBoardRef.current) {
						// First parse the move
						const from = uci.slice(0, 2) as SquareNotation;
						const to = uci.slice(2, 4) as SquareNotation;
						const promotionChar = uci.length > 4 ? uci.charAt(4) : undefined;
						const promotion =
							promotionChar && ["n", "b", "r", "q"].includes(promotionChar)
								? (promotionChar as "n" | "b" | "r" | "q")
								: undefined;

						// Get move description BEFORE making the move
						const moveDescription = getDescriptiveMove(logicGame, uci);
						console.log("AI Move Description:", moveDescription);

						// Then animate and apply the move
						chessBoardRef.current.move(from, to, promotion);

						// Also update the game state
						logicGame.move({ from, to, promotion });

						// Update state and switch active player
						setActivePlayer("w"); // After AI (black) moves, it's white's turn
						setIsMyTurn(true);

						checkGameOver();

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

		initializeGame();

		return () => {
			console.log("Game component cleanup - stopping engine");
			stopEngine();
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, []);

	// Handle initial turn state based on color
	useEffect(() => {
		// If player is white, it's their turn. If black, AI's turn immediately.
		// Wait, startEngine initializes stockfish.
		// If AI is white, AI should move first.
		if (playerColor === "b") {
			// Player is Black. AI is White.
			// AI moves first.
			// We need to trigger AI move?
			// But game logic says white starts.
			setIsMyTurn(false);
			// We can trigger AI move by calling analyzePosition on initial position?
			// analyzePosition will make stockfish think.
			// Stockfish defaults to analyzing current position.
			// Current position is startpos. White to move.
			// So yes, just trigger analyze.
			const level = levelSelected ? parseInt(levelSelected, 10) : 5;
			analyzePosition(logicGame.fen(), level);
		} else {
			setIsMyTurn(true);
		}
	}, [playerColor, levelSelected]);

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
								(isPlayerWhite ? session?.user.aud : "") ||
								"https://www.shutterstock.com/image-vector/young-smiling-man-avatar-brown-600nw-2261401207.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						{isPlayerWhite ? session?.user.aud : "AI"}
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
								(isPlayerWhite ? "" : "AI") ||
								"https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						{isPlayerWhite ? "AI" : session?.user.aud}
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

			{/* Board Area */}
			<View className="flex-1 items-center justify-center">
				<ChessBoard
					ref={chessBoardRef}
					orientation={isPlayerWhite ? "w" : "b"}
					onMove={onMyMove}
				/>
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
				<TouchableOpacity onPress={() => setVoiceOn((v) => !v)} className="p-2">
					<FontAwesome5
						name={voiceOn ? "volume-up" : "volume-mute"}
						size={24}
						color={voiceOn ? "#4caf50" : "#999"}
					/>
				</TouchableOpacity>

				{/* <TouchableOpacity className="p-2" onPress={handleUndo}>
							<MaterialIcons name="undo" size={28} color="lightgray" />
						</TouchableOpacity> */}

				<TouchableOpacity className="p-2">
					<MaterialIcons name="flag" size={28} color="#e53935" />
				</TouchableOpacity>
			</View>

			{/* Game Over Overlay */}
			<GameOverModal
				isOpen={isModalVisible}
				isWinner={gameOver.winner === (isPlayerWhite ? "w" : "b")}
				onRematch={() => {
					setIsModalVisible(false);
					router.replace({
						pathname: "/offline-game",
						params: {
							levelSelected: levelSelected,
							playerColor: playerColor,
							timeSelected: timeSelected,
						},
					});
				}}
				onNewGame={() => {
					setIsModalVisible(false);
					router.replace("/play-options");
				}}
				onClose={() => setIsModalVisible(false)}
			/>
		</ThemedView>
	);
}
