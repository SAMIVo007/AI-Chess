import React, { useEffect, useRef, useState, useMemo } from "react";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
	MaterialIcons,
	FontAwesome5,
	MaterialCommunityIcons,
} from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { Chess, Move, Square as SquareNotation } from "chess.js";
import { startEngine, analyzePosition, stopEngine } from "@/utils/ai";
import { speakMove } from "@/utils/voice";
import { PieceType } from "chess.js";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { isGameActive } from "@/api/supabaseAPI";
import { ActivityIndicator, Alert, BackHandler, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import ChessBoard, { ChessBoardRef } from "@/components/chess/ChessBoard";
import GameOverModal, {
	GameEndReason,
	GameResult,
} from "@/components/GameOverModal";
import { CapturedPieces } from "@/components/chess/CapturedPieces";
import { Image } from "expo-image";
import { AiBlurhash, UserBlurhash } from "@/constants/Blurhashes";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

	// Create a temp game to avoid mutating the main instance state/history during analysis
	const tempGame = new Chess(game.fen());

	// Get piece information before move
	const piece = tempGame.get(from);
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
	const moveInfo = tempGame.move({ from, to, promotion });

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

	// No need to undo on tempGame, it's discarded
	// game.undo();

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
	const insets = useSafeAreaInsets();
	const { levelSelected, timeSelected, playerColor, allowUndo } =
		useLocalSearchParams<{
			levelSelected: string;
			timeSelected: string;
			playerColor?: "w" | "b";
			allowUndo?: string;
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
	const listRef = useRef<FlatList<any>>(null);

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
		if (viewingMoveIndex !== null) return; // Block interaction if viewing history

		// This callback fires ONLY when WE make a move on the board
		// 1. Update Logic Game
		logicGame.move(move); // Sync local logic
		setIsMyTurn(false); // Immediate lock

		// Update history state
		setMoveHistory(logicGame.history());

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
			const safeLevel =
				levelSelected && !isNaN(parseInt(levelSelected, 10))
					? parseInt(levelSelected, 10)
					: 5;
			await analyzePosition(logicGame.fen(), safeLevel);
		}
	};

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

	// Navigation & History State
	const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null); // null = live
	const [moveHistory, setMoveHistory] = useState<string[]>([]); // SAN moves for display

	const moveHistoryArray = useMemo(
		() =>
			moveHistory.length > 0
				? Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
						const moveIndex = i * 2;
						return {
							turnNumber: i + 1,
							white: moveHistory[moveIndex],
							black: moveHistory[moveIndex + 1] || "",
							wIndex: moveIndex,
							bIndex: moveIndex + 1,
						};
				  })
				: [],
		[moveHistory]
	);

	const handleResign = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Alert.alert(
			"Resign Game",
			"Are you sure you want to resign? This will count as a loss.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Resign",
					style: "destructive",
					onPress: async () => {
						setGameOver({
							over: true,
							reason: "resignation",
							winner: isPlayerWhite ? "b" : "w",
						});
						setIsModalVisible(true);
					},
				},
			]
		);
	};

	const handleNavigation = (
		action: "start" | "prev" | "next" | "end" | "view",
		index?: number
	) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (moveHistory.length === 0) return;

		let newIndex = viewingMoveIndex;

		if (action === "view" && typeof index === "number") {
			newIndex = index;
		} else if (action === "end") {
			newIndex = null;
		} else if (action === "start") {
			newIndex = -1; // Before first move
		} else if (action === "prev") {
			if (newIndex === null) {
				newIndex = moveHistory.length - 1; // Start at last move
			} else {
				newIndex = Math.max(-1, newIndex - 1);
			}
		} else if (action === "next") {
			if (newIndex === null) return; // Already live
			if (newIndex === moveHistory.length - 1) {
				newIndex = null; // Go back to live
			} else {
				newIndex = newIndex + 1;
			}
		}

		setViewingMoveIndex(newIndex);

		// Synchronize Board with TEMP instance
		const tempGame = new Chess();
		if (newIndex === null) {
			// Restore live
			chessBoardRef.current?.reset(logicGame.fen());
		} else if (newIndex === -1) {
			// Start pos
			chessBoardRef.current?.reset(tempGame.fen());
		} else {
			// Replay moves
			for (let i = 0; i <= newIndex; i++) {
				tempGame.move(moveHistory[i]);
			}
			chessBoardRef.current?.reset(tempGame.fen());
		}
	};

	const handleUndo = () => {
		Haptics.selectionAsync();
		if (viewingMoveIndex !== null) return; // Can't undo while viewing history
		if (logicGame.history().length === 0) return;

		// 1. Undo AI move (if exist)
		// 2. Undo My move
		// Wait, if it is my turn, it means AI just moved?
		// No, if isMyTurn is true, it means I am about to move. Last move was AI.
		// So undo AI move, then Undo my move.
		// If isMyTurn is false (AI thinking), we shouldn't allow undo ideally, or we interrupt AI?
		// Logic:
		// Undo twice to get back to "My Turn".

		// Check if it's currently my turn
		if (isMyTurn) {
			// Undo AI's move (last move)
			logicGame.undo();
			// Undo My move (move before that)
			logicGame.undo();
		} else {
			// If AI is thinking, we might be in trouble state-wise if we just undo.
			// Ideally disable Undo while AI is thinking.
			return;
		}

		// Update Board
		chessBoardRef.current?.reset(logicGame.fen());

		// Update History
		const h = logicGame.history();
		setMoveHistory(h);

		// Update Captures - need to recalculate from scratch is safest
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

		// Reset active player to me
		setActivePlayer(isPlayerWhite ? "w" : "b");
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

						// Validate move logic first (prevent applying stale/illegal moves)
						// This returns the move object if valid, or null if invalid
						const validMove = logicGame.move({ from, to, promotion });

						if (!validMove) {
							console.warn("Received invalid/stale move from AI:", uci);
							// Sync board to ensure visual consistency
							chessBoardRef.current.reset(logicGame.fen());
							return;
						}

						// If valid, Proceed with visual move
						chessBoardRef.current.move(from, to, promotion);

						// Update history state (CRITICAL FIX)
						setMoveHistory(logicGame.history());

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
			// So yes, just trigger analyze.
			const safeLevel =
				levelSelected && !isNaN(parseInt(levelSelected, 10))
					? parseInt(levelSelected, 10)
					: 5;
			setTimeout(() => {
				analyzePosition(logicGame.fen(), safeLevel);
			}, 500);
		} else {
			setIsMyTurn(true);
		}
	}, [playerColor, levelSelected]);

	// useEffect(() => {
	// 	if (history.length > 0) {
	// 		listRef.current?.scrollToEnd({ animated: true });
	// 	}
	// }, [history]);

	// Reset game state for rematch
	const resetGame = () => {
		// Reset logic game
		logicGame.reset();

		// Reset visual board
		chessBoardRef.current?.reset();

		// Reset captured pieces
		setCapturedByWhite([]);
		setCapturedByBlack([]);
		setMoveHistory([]); // Reset history

		// Reset game status
		setGameOver({ over: false, reason: "checkmate", winner: null });
		setIsModalVisible(false);
		setGameStarted(false);

		// Reset Clocks
		const timeInSeconds = timeSelected ? parseInt(timeSelected, 10) : 300;
		setWhiteTime(timeInSeconds);
		setBlackTime(timeInSeconds);
		setActivePlayer("w");

		// Handle turn reset
		if (playerColor === "b") {
			// AI (White) moves first
			setIsMyTurn(false);
			const level = levelSelected ? parseInt(levelSelected, 10) : 5;
			setTimeout(() => {
				analyzePosition(logicGame.fen(), level);
			}, 500); // Small delay to ensure UI is ready
		} else {
			setIsMyTurn(true);
		}
	};

	const handleBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (gameStarted) {
			Alert.alert(
				"Game in Progress",
				"This game will continue in the background. You can return to it from the Home screen at any time.",
				[
					{
						text: "Cancel",
						style: "cancel",
					},
					{
						text: "Leave Game",
						style: "destructive",
						onPress: () => router.back(),
					},
				]
			);
		} else {
			router.back();
		}
	};

	// Handle hardware back button (Android)
	useEffect(() => {
		const backAction = () => {
			if (gameStarted) {
				handleBack();
				return true; // Prevent default behavior
			}
			return false;
		};

		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			backAction
		);

		return () => backHandler.remove();
	}, [gameStarted]);

	return (
		<ThemedView
			className="flex-1 bg-gray-50 dark:bg-black"
			style={{ paddingTop: insets.top }}
		>
			{/* Top Bar */}
			<View className="flex-row items-center justify-between px-4 pt-3 pb-4">
				<TouchableOpacity
					onPress={handleBack}
					className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
				>
					<MaterialIcons name="arrow-back-ios-new" size={20} color="gray" />
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
				<View className="flex-row items-center justify-between mb-8">
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
						interactive={viewingMoveIndex === null}
					/>
				</View>

				{/* Player (Bottom) */}
				<View className="flex-row items-center justify-between mt-8">
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

			{/* Move History Strip */}
			<View className="h-12 bg-white dark:bg-black/40 border-t border-gray-200 dark:border-gray-800">
				<FlatList
					ref={listRef}
					data={moveHistoryArray}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
					keyExtractor={(item) => item.turnNumber.toString()}
					renderItem={({ item }) => {
						const isWhiteSelected = viewingMoveIndex === item.wIndex;
						const isBlackSelected = viewingMoveIndex === item.bIndex;

						return (
							<View className="flex-row items-center mr-4">
								<Text className="text-gray-500 dark:text-gray-500 font-mono mr-2 text-xs">
									{item.turnNumber}.
								</Text>
								<TouchableOpacity
									onPress={() => handleNavigation("view", item.wIndex)}
									className={`px-2 py-1 rounded ${
										isWhiteSelected
											? "bg-indigo-500"
											: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
									}`}
								>
									<Text
										className={`${
											isWhiteSelected
												? "text-white font-bold"
												: "text-gray-800 dark:text-gray-200"
										} text-sm font-medium`}
									>
										{item.white}
									</Text>
								</TouchableOpacity>
								{item.black ? (
									<TouchableOpacity
										onPress={() => handleNavigation("view", item.bIndex)}
										className={`px-2 py-1 rounded ml-1 ${
											isBlackSelected
												? "bg-indigo-500"
												: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
										}`}
									>
										<Text
											className={`${
												isBlackSelected
													? "text-white font-bold"
													: "text-gray-800 dark:text-gray-200"
											} text-sm font-medium`}
										>
											{item.black}
										</Text>
									</TouchableOpacity>
								) : null}
							</View>
						);
					}}
					onContentSizeChange={() => {
						if (viewingMoveIndex === null) {
							listRef.current?.scrollToEnd({ animated: true });
						}
					}}
				/>
			</View>

			{/* Bottom Controls */}
			<View className="flex-row items-center justify-between px-6 py-4 pb-8 bg-white/10 dark:bg-black/20 border-t border-gray-200 dark:border-gray-800">
				<View className="flex-row items-center gap-2">
					{/* Undo Button (Start) - Only if enabled */}
					{allowUndo === "true" && (
						<Pressable
							onPress={handleUndo}
							disabled={
								!isMyTurn || moveHistory.length === 0 || viewingMoveIndex !== null
							}
							className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-2 overflow-hidden"
							android_ripple={{ color: "#7576a8ff", foreground: true }}
						>
							<MaterialCommunityIcons
								name="undo-variant"
								size={20}
								color={
									!isMyTurn || moveHistory.length === 0 || viewingMoveIndex !== null
										? "gray"
										: "#6366f1"
								}
							/>
						</Pressable>
					)}

					{/* Resign Button */}
					<Pressable
						onPress={handleResign}
						className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center overflow-hidden"
						disabled={gameOver.over}
						android_ripple={{ color: "#996e6eff", foreground: true }}
					>
						<MaterialIcons
							name="flag"
							size={24}
							color={gameOver.over ? "gray" : "#ef4444"}
						/>
					</Pressable>

					{/* Voice Button */}
					<Pressable
						onPress={() => {
							Haptics.selectionAsync();
							setVoiceOn((v) => !v);
						}}
						className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mx-2 overflow-hidden"
						android_ripple={{ color: "#7576a8ff", foreground: true }}
					>
						<MaterialCommunityIcons
							name={voiceOn ? "account-voice" : "microphone-off"}
							size={24}
							color={voiceOn ? "#4caf50" : "#999"}
						/>
					</Pressable>
				</View>

				{/* Navigation Controls */}
				<View className="flex-row items-center gap- bg-gray-100 dark:bg-gray-800/50 rounded-2xl">
					<Pressable
						onPress={() => handleNavigation("start")}
						disabled={moveHistory.length === 0}
						style={{ borderRadius: 14, overflow: "hidden", padding: 8 }}
						android_ripple={{ color: "#7576a8ff", foreground: true }}
						hitSlop={10}
					>
						<MaterialIcons
							name="first-page"
							size={28}
							color={moveHistory.length === 0 ? "gray" : "#6366f1"}
						/>
					</Pressable>

					<Pressable
						onPress={() => handleNavigation("prev")}
						disabled={moveHistory.length === 0}
						style={{ borderRadius: 14, overflow: "hidden", padding: 8 }}
						android_ripple={{ color: "#7576a8ff", foreground: true }}
						hitSlop={10}
					>
						<MaterialIcons
							name="chevron-left"
							size={28}
							color={moveHistory.length === 0 ? "gray" : "#6366f1"}
						/>
					</Pressable>

					<Pressable
						onPress={() => handleNavigation("next")}
						disabled={viewingMoveIndex === null}
						style={{ borderRadius: 14, overflow: "hidden", padding: 8 }}
						android_ripple={{ color: "#7576a8ff", foreground: true }}
						hitSlop={10}
					>
						<MaterialIcons
							name="chevron-right"
							size={28}
							color={viewingMoveIndex === null ? "gray" : "#6366f1"}
						/>
					</Pressable>

					<Pressable
						onPress={() => handleNavigation("end")}
						disabled={viewingMoveIndex === null}
						style={{ borderRadius: 14, overflow: "hidden", padding: 8 }}
						android_ripple={{ color: "#7576a8ff", foreground: true }}
						hitSlop={10}
					>
						<MaterialIcons
							name="last-page"
							size={28}
							color={viewingMoveIndex === null ? "gray" : "#6366f1"}
						/>
					</Pressable>
				</View>
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
				onRematch={resetGame}
				onNewGame={() => {
					setIsModalVisible(false);
					router.replace("/play-options");
				}}
				onClose={() => setIsModalVisible(false)}
			/>
		</ThemedView>
	);
}
