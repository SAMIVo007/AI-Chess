import React, { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
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
import GameOverModal, {
	GameEndReason,
	GameResult,
} from "@/components/GameOverModal";
import { CapturedPieces } from "@/components/chess/CapturedPieces";
import { Image } from "expo-image";
import { AiBlurhash, UserBlurhash } from "@/constants/Blurhashes";

const { width } = Dimensions.get("window");

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

const getRating = (levelSelected: string): string => {
	switch (levelSelected) {
		case "1":
			return "800";
		case "2":
			return "1000";
		case "3":
			return "1200";
		case "4":
			return "1400";
		case "5":
			return "1600";
		case "6":
			return "1800";
		case "7":
			return "2000";
		case "8":
			return "2200";
		case "9":
			return "2400";
		case "10":
			return "2600";
		default:
			return "1600";
	}
};

export default function GameScreen() {
	const router = useRouter();
	const { session, profile } = useAuth();
	const { levelSelected, timeSelected, playerColor } = useLocalSearchParams<{
		levelSelected: string;
		timeSelected: string;
		playerColor?: "w" | "b";
	}>();

	console.log("Game params:", { levelSelected, timeSelected, playerColor });
	console.log("user: ", profile);

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

		// Track captured pieces
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
			let winner: "w" | "b" | null = null;
			let reason: GameEndReason = "checkmate";

			if (logicGame.in_checkmate()) {
				// The player whose turn it is is checkmated, so the OTHER player wins
				winner = logicGame.turn() === "w" ? "b" : "w";
				reason = "checkmate";
			} else if (logicGame.in_stalemate()) {
				reason = "stalemate";
			} else if (logicGame.in_threefold_repetition()) {
				reason = "threefold_repetition";
			} else if (logicGame.insufficient_material()) {
				reason = "insufficient_material";
			} else if (logicGame.in_draw()) {
				reason = "draw";
			}

			setGameOver({ over: true, reason, winner });
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

						// Update state and switch active player
						setActivePlayer("w"); // After AI (black) moves, it's white's turn
						setIsMyTurn(true);

						setTimeout(() => {
							checkGameOver();
						}, 1000);

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
							<Image
								source={{
									uri: "https://is1-ssl.mzstatic.com/image/thumb/Purple3/v4/30/35/ae/3035ae18-d9f9-7c3e-bf6d-055bff5c5d5a/mzl.rhnwdrfl.png/1024x1024bb.png",
								}}
								style={{ width: "100%", height: "100%" }}
								placeholder={{ blurhash: AiBlurhash }}
								contentFit="cover"
								transition={1000}
							/>
						</View>
						<View>
							<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
								Stockfish AI ({getRating(levelSelected)})
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
							<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{profile?.username || session?.user?.email?.split("@")[0] || "Player"}
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
				result={
					gameOver.winner === null
						? "draw"
						: gameOver.winner === (isPlayerWhite ? "w" : "b")
						? "win"
						: "loss"
				}
				reason={gameOver.reason}
				playerColor={isPlayerWhite ? "w" : "b"}
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
