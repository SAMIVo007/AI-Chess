import React, { useEffect, useRef, useState } from "react";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
	cancelAnimation,
	Easing,
} from "react-native-reanimated";
import type { ComponentProps } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Dimensions,
	Share,
	Alert,
	BackHandler,
	Pressable,
	ToastAndroid,
	Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { handleGoBack } from "@/utils/goBackHandler";

const getDescriptiveMove = (
	game: InstanceType<typeof Chess>,
	uci: string,
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

const { width } = Dimensions.get("window");

export default function GameScreen() {
	const router = useRouter();
	const { session, profile } = useAuth();
	const userId = session?.user?.id;
	const insets = useSafeAreaInsets();
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
	const [createdAt, setCreatedAt] = useState<string | null>(null);

	// Voice toggle (optional)
	const [voiceOn, setVoiceOn] = useState(true);
	const voiceOnRef = useRef(voiceOn);

	// Chess clocks with active player tracking
	const [whiteTime, setWhiteTime] = useState<number | undefined>(
		timeSelected ? parseInt(timeSelected, 10) : 300,
	);
	const [blackTime, setBlackTime] = useState<number | undefined>(
		timeSelected ? parseInt(timeSelected, 10) : 300,
	);
	const [activePlayer, setActivePlayer] = useState<"w" | "b">("w"); // White starts
	const [gameStarted, setGameStarted] = useState(false);

	// Pulsating animation for active player's clock (∞ symbol)
	const pulseOpacity = useSharedValue(1);

	useEffect(() => {
		if (gameStarted && !gameOver.over && !timeSelected) {
			pulseOpacity.value = withRepeat(
				withSequence(
					withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
					withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
				),
				-1, // infinite
			);
		} else {
			cancelAnimation(pulseOpacity);
			pulseOpacity.value = 1;
		}
	}, [gameStarted, gameOver.over, timeSelected]);

	const activePulseStyle = useAnimatedStyle(() => ({
		opacity: pulseOpacity.value,
	}));

	const inactivePulseStyle = useAnimatedStyle(() => ({
		opacity: 0.4,
	}));

	// Timer refs for cleanup
	const timerRef = useRef<number | null>(null); // Keep as number for setInterval ID

	const chessBoardRef = useRef<ChessBoardRef>(null);
	const listRef = useRef<FlatList<any>>(null);

	// Navigation & History State
	const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null); // null = live
	const viewingMoveIndexRef = useRef<number | null>(null);
	const [moveHistory, setMoveHistory] = useState<string[]>([]); // SAN moves for display

	// Keep a local game instance PURELY for logic/history/validation checks
	// (Optional, but good for calculating isMyTurn etc without querying child)
	const [logicGame] = useState(new Chess());

	// Keep voiceOnRef updated with current voiceOn value
	useEffect(() => {
		voiceOnRef.current = voiceOn;
	}, [voiceOn]);

	useEffect(() => {
		viewingMoveIndexRef.current = viewingMoveIndex;
	}, [viewingMoveIndex]);

	useEffect(() => {
		if (!gameId || !userId) return;

		let isMounted = true;

		const showToast = (message: string) => {
			if (!isMounted) return;
			if (Platform.OS === "android") {
				ToastAndroid.show(message, ToastAndroid.SHORT);
			} else {
				// iOS doesn't have a native toast, we could use an Alert or a custom component.
				// For now, silently log or use Alert (though redundant if connection just hiccups)
				// Alert.alert("Notice", message);
				console.log(message);
			}
		};

		let channel: ReturnType<typeof supabase.channel> | null = null;

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

		const setupGame = async () => {
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

				if (!isMounted) return;

				// Store status & date
				setStatus(gameData.status);
				if (gameData.created_at) {
					setCreatedAt(gameData.created_at);
				}

				// Identity
				const isWhite = gameData.white_player_id === userId;
				setIsPlayerWhite(isWhite);

				// Fetch opponent profile if they exist
				if (isWhite && gameData.black_player_id) {
					fetchOpponentProfile(gameData.black_player_id);
				} else if (!isWhite && gameData.white_player_id) {
					fetchOpponentProfile(gameData.white_player_id);
				}

				if (!isMounted) return;

				// Load game state if it exists
				if (gameData.fen) {
					logicGame.load(gameData.fen);
					chessBoardRef.current?.reset(gameData.fen);
				}

				if (gameData.pgn) {
					logicGame.load_pgn(gameData.pgn);
					setMoveHistory(logicGame.history());

					// Also restore captured pieces
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

					// Highlight last move on the board
					if (history.length > 0) {
						const lastMove = history[history.length - 1];
						chessBoardRef.current?.highlightLastMove(lastMove.from, lastMove.to);
					}
				}

				// Set turn
				const currentTurn = logicGame.turn();
				if (gameData.status === "completed") {
					setIsMyTurn(false);
				} else {
					setIsMyTurn(
						(isWhite && currentTurn === "w") || (!isWhite && currentTurn === "b"),
					);
				}
				setActivePlayer(currentTurn as "w" | "b");

				// If game is completed/active, handle start
				if (gameData.status === "active") {
					setGameStarted(true);
				}

				// Realtime Subscription
				if (!isMounted) return;
				console.log(`Subscribing to channel: game-${gameId}`);
				channel = supabase
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
							try {
								console.log("Received Realtime Update:", payload);
								const newData = payload.new;

								// 1. Status Update
								if (newData.status === "active") {
									setStatus("active");
									setGameStarted(true);

									// Fetch opponent info if we don't have it yet
									if (isWhite && newData.black_player_id) {
										fetchOpponentProfile(newData.black_player_id);
									} else if (!isWhite && newData.white_player_id) {
										fetchOpponentProfile(newData.white_player_id);
									}
								} else if (newData.status === "completed") {
									setStatus("completed");
									setGameStarted(false);
									setIsMyTurn(false);

									const winnerId = newData.winner_id;
									let winner: "w" | "b" | null = null;
									if (winnerId) {
										// If winnerId matches session user?
										// No, winnerID is the UUID.
										// We need to map UUID to 'w' or 'b'.
										// If winnerId == session.user.id => I won.
										// If I am white, then winner is 'w'.
										if (winnerId === userId) {
											winner = isWhite ? "w" : "b";
										} else {
											// Opponent won
											winner = isWhite ? "b" : "w";
										}
									}

									// Check if game is properly over locally?
									// Use explicit reason if available from DB
									const resultReason = newData.result_reason as GameEndReason | null;

									if (!logicGame.game_over()) {
										setGameOver({
											over: true,
											reason: resultReason || "resignation",
											winner,
										});
										setIsModalVisible(true);
									} else {
										// If logic says game over, we might want to ensure reasons match if needed
										// But local board state is authoritative for checkmates usually.
										// However, for draws/stalemates, it's good to sync.
										// For now, if board is game over, we likely handled it via onMyMove or fen update.
									}
								}

								// 2. Handle Moves (Opponent)
								if (newData.fen !== logicGame.fen()) {
									console.log("Opponent moved! Updating board...");
									if (newData.pgn) {
										const prevHistoryLength = logicGame.history().length;
										logicGame.load_pgn(newData.pgn);
										const history = logicGame.history({ verbose: true });
										const sanHistory = logicGame.history();
										setMoveHistory(sanHistory);

										// If user was viewing live, stay on live (null) logic
										// If user was viewing history, do nothing (stay on that move)
										if (viewingMoveIndexRef.current === null) {
											// Ensure visual board is synced if we are live
											// Check if it's a single move we can animate
											if (history.length === prevHistoryLength + 1) {
												const lastMove = history[history.length - 1];
												chessBoardRef.current?.move(
													lastMove.from,
													lastMove.to,
													lastMove.promotion,
												);
											} else {
												// Fallback for multiple moves or complex state changes
												chessBoardRef.current?.reset(newData.fen);
											}
										}

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
									const turn = logicGame.turn();
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
							} catch (err) {
								console.error("Error processing realtime update:", err);
							}
						},
					)
					.subscribe((status) => {
						console.log(`CHANNEL_STATUS for game-${gameId}:`, status);
						if (status === "CHANNEL_ERROR") {
							showToast("Connection Error!");
						}
					});
			} catch (error) {
				console.error("Error initializing online game:", error);
			}
		};

		setupGame();

		return () => {
			isMounted = false;
			if (channel) {
				console.log(`Unsubscribing from channel: game-${gameId}`);
				supabase.removeChannel(channel);
			}
		};
	}, [gameId, userId]);

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

		// Block moves if game is completed
		// Block moves if game is completed OR viewing history
		if (status === "completed" || viewingMoveIndex !== null) {
			// Ideally we should prevent interaction.
			// Since we can't easily undo the internal visual state without a ref reset,
			// we rely on the fact that we won't send update to server.
			// But for better UX, we should reload the game state to 'undo' the invalid move visually.
			// However, a simpler approach is just to return and let the user see the move but nothing happens.
			// Or better: Re-load the current FEN to snap back.
			if (viewingMoveIndex !== null) {
				// Snap back to viewed state
				// Need to recalculate viewed state FEN.
				// For now, honestly, ignoring is okay, but visual glitch remains.
				// We'll rely on handleNavigation to reset if needed, or just let it slide for MVP.
				// Ideally:
				// chessBoardRef.current?.reset(getCurrentViewFet());
				// But we don't have that function extracted.
				// Let's just return. The board component might allow the move visually but we won't process it.
			} else {
				chessBoardRef.current?.reset(logicGame.fen());
			}
			return;
		}

		// 1. Update Logic Game
		logicGame.move(move); // Sync local logic
		setIsMyTurn(false); // Immediate lock

		const isGameOver = logicGame.game_over();
		let winner: "w" | "b" | "draw" | null = null;
		let reason: GameEndReason | null = null;

		if (isGameOver) {
			if (logicGame.in_checkmate()) {
				winner = logicGame.turn() === "w" ? "b" : "w";
				reason = "checkmate";
			} else if (logicGame.in_stalemate()) {
				winner = "draw";
				reason = "stalemate";
			} else if (logicGame.in_threefold_repetition()) {
				winner = "draw";
				reason = "threefold_repetition";
			} else if (logicGame.insufficient_material()) {
				winner = "draw";
				reason = "insufficient_material";
			} else if (logicGame.in_draw()) {
				winner = "draw";
				reason = "draw";
			}
		}

		// 2. Send to Supabase
		if (gameId) {
			const updatePayload: any = {
				fen: logicGame.fen(),
				pgn: logicGame.pgn(),
				turn: logicGame.turn(),
				status: isGameOver ? "completed" : "active",
			};

			if (isGameOver) {
				updatePayload.result_reason = reason; // Save explicit reason

				if (logicGame.in_checkmate()) {
					// The player who just moved (ME) won
					updatePayload.winner_id = session?.user?.id;
				} else {
					// Draw (stalemate, repetition, etc.)
					updatePayload.winner_id = null;
				}
			}

			await supabase.from("games").update(updatePayload).eq("id", gameId);

			// Track captures
			const history = logicGame.history({ verbose: true });
			setMoveHistory(logicGame.history());

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

			if (isGameOver && reason) {
				// Convert "draw" string to null for GameOverModal if needed,
				// but Modal expects "w" | "b" | null.
				// If winner is "draw", we pass null to modal?
				// Modal expects: winner: "w" | "b" | null.
				// Our logic above set winner to "draw" for database.
				// Let's adjust for local state.
				const modalWinner = winner === "draw" ? null : (winner as "w" | "b");

				setGameOver({ over: true, reason, winner: modalWinner });
				setIsModalVisible(true);
			}
		}
	};

	const handleResign = () => {
		Alert.alert(
			"Resign Game",
			"Are you sure you want to resign? This will count as a loss.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Resign",
					style: "destructive",
					onPress: async () => {
						if (!gameId || !session) return;
						const opponentId = isPlayerWhite
							? opponentProfile?.id // If I am White, opponent is Black
							: session.user.id; // Wait... opponentProfile?.id is the opponent.
						// Wait, verify opponent ID logic.
						// My ID = session.user.id
						// If I resign, winner is opponent.
						// I need the opponent's ID.
						// However, Supabase update requires 'winner_id'.
						// The fetchOpponentProfile sets `opponentProfile`.
						// But if opponent hasn't joined yet (unlikely if active), it might be null?
						// Active game implies both players exist usually, but let's be safe.
						// Actually, better to check who I am.
						// If I am white, winner is BlackPlayerID.
						// I don't have BlackPlayerID easily stored in state except via refetch or props passed...
						// Ah, I lost access to `gameData` outside useEffect.
						// Let's assume opponentProfile.id is reliable if game is active.
						// Or just set based on colour logic?
						// If I am white, winner is 'b'? No, schema expects UUID usually or 'w'/'b' depending on implementation.
						// Looking at `onMyMove`: `updatePayload.winner_id = session?.user?.id;`
						// So it expects UUID.

						// Let's start with local state update to prevent further moves
						setStatus("completed");
						setGameOver({
							over: true,
							reason: "resignation",
							winner: isPlayerWhite ? "b" : "w",
						});
						setIsModalVisible(true);

						// Server update
						await supabase
							.from("games")
							.update({
								status: "completed",
								winner_id: opponentProfile?.id || null, // Fallback null if bug
								result_reason: "resignation",
							})
							.eq("id", gameId);
					},
				},
			],
		);
	};

	const handleNavigation = (
		action: "start" | "prev" | "next" | "end" | "view",
		index?: number,
	) => {
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

		// Synchronize Board
		// We need to calculate the FEN at this point.
		// logicGame currently holds the LIVE state. We shouldn't mutate it?
		// Or we can clone it.
		// Actually chess.js is fast.
		const tempGame = new Chess();

		if (newIndex === null) {
			// Restore live
			chessBoardRef.current?.reset(logicGame.fen());
		} else if (newIndex === -1) {
			// Start pos
			chessBoardRef.current?.reset(tempGame.fen());
		} else {
			// Replay up to index
			// Creating a new chess instance and moving N times is safest.
			// Optimization: PGN loading might be easier but requires parsing.
			// Just iterating moves is fine.
			for (let i = 0; i <= newIndex; i++) {
				tempGame.move(moveHistory[i]);
			}
			chessBoardRef.current?.reset(tempGame.fen());
		}
	};

	// Format mm:ss
	const formatTime = (t: number) =>
		`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
			2,
			"0",
		)}`;

	// Called by Board when game ends
	const handleGameOver = (reason: GameEndReason, winner: "w" | "b" | null) => {
		setGameOver({ over: true, reason, winner });
	};

	const handleBack = () => {
		if (status === "active") {
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
						onPress: handleGoBack,
					},
				],
			);
		} else {
			handleGoBack();
		}
	};

	// Handle hardware back button (Android)
	useEffect(() => {
		const backAction = () => {
			if (status === "active") {
				handleBack();
				return true; // Prevent default behavior
			}
			return false;
		};

		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			backAction,
		);

		return () => backHandler.remove();
	}, [status]);

	return (
		<ThemedView
			className="flex-1 bg-[#151718]"
			style={{ paddingTop: insets.top }}
		>
			{/* Top Bar */}
			<View className="flex-row items-center justify-between px-4 pt-3 pb-4">
				<TouchableOpacity
					onPress={handleBack}
					className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center"
				>
					<MaterialIcons name="arrow-back-ios-new" size={20} color="gray" />
				</TouchableOpacity>
				<View className="items-center">
					<Text className="text-lg font-semibold text-[#ECEDEE]">
						{status === "completed"
							? "Game Finished"
							: !!timeSelected
								? "Time Attack"
								: "Unlimited Time"}
					</Text>
					{status === "completed" && createdAt && (
						<Text className="text-xs text-gray-400">
							{new Date(createdAt).toLocaleDateString(undefined, {
								year: "numeric",
								month: "short",
								day: "numeric",
							})}
						</Text>
					)}
				</View>
				<TouchableOpacity className="p-2 opacity-0" disabled>
					<MaterialIcons name="settings" size={24} color="lightgray" />
				</TouchableOpacity>
			</View>

			{/* Game Over Banner */}
			{status === "completed" && (
				<View
					className="bg-gray-800/80 absolute self-center z-50 px-6 py-2 rounded-full border border-gray-700 pointer-events-none"
					style={{ top: insets.top + 65 }}
				>
					<Text className="text-gray-200 font-medium text-sm">
						Reviewing Past Game
					</Text>
				</View>
			)}

			{/* Players & Clocks */}
			<View className="flex-1 justify-center w-full self-center">
				{/* Opponent (Top) */}
				<View className="flex-row items-center justify-between px-4 mb-8">
					<View className="flex-row items-center">
						<View className="rounded-full w-14 h-14 mr-3 border border-gray-600 justify-center items-center overflow-hidden">
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
							<Text className="text-base font-semibold text-[#ECEDEE]">
								{opponentProfile?.username || opponentProfile?.full_name || "Opponent"}
							</Text>
							<CapturedPieces
								captured={isPlayerWhite ? capturedByBlack : capturedByWhite}
								color={isPlayerWhite ? "w" : "b"}
							/>
						</View>
					</View>

					<View
						style={{
							paddingHorizontal: 12,
							paddingVertical: 4,
							borderRadius: 6,
							backgroundColor: isPlayerWhite ? "#1f2937" : "#ECEDEE",
						}}
					>
						{!!timeSelected ? (
							<Text
								style={{
									fontSize: 18,
									fontWeight: "bold",
									fontFamily: "monospace",
									color: isPlayerWhite ? "#e5e7eb" : "#111827",
								}}
							>
								{formatTime(blackTime || 0)}
							</Text>
						) : (
							<Animated.View
								style={[
									// Opponent is black when I'm white, white when I'm black
									activePlayer === (isPlayerWhite ? "b" : "w") &&
									gameStarted &&
									!gameOver.over
										? activePulseStyle
										: inactivePulseStyle,
								]}
							>
								<Ionicons
									name="infinite"
									size={18}
									color={isPlayerWhite ? "#e5e7eb" : "#111827"}
								/>
							</Animated.View>
						)}
					</View>
				</View>

				{/* Board Area */}
				<ChessBoard
					ref={chessBoardRef}
					orientation={isPlayerWhite ? "w" : "b"}
					onMove={onMyMove}
				/>

				{/* Player (Bottom) */}
				<View className="flex-row items-center justify-between px-4 mt-8">
					<View className="flex-row items-center">
						<View className="rounded-full w-14 h-14 mr-3 border border-gray-600 justify-center items-center overflow-hidden">
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
							<Text className="text-base font-semibold text-[#ECEDEE]">
								{profile?.username || "Player"}
							</Text>
							<CapturedPieces
								captured={isPlayerWhite ? capturedByWhite : capturedByBlack}
								color={isPlayerWhite ? "b" : "w"}
							/>
						</View>
					</View>

					<View
						style={{
							paddingHorizontal: 12,
							paddingVertical: 4,
							borderRadius: 6,
							backgroundColor: isPlayerWhite ? "#ECEDEE" : "#1f2937",
						}}
					>
						{!!timeSelected ? (
							<Text
								style={{
									fontSize: 18,
									fontWeight: "bold",
									fontFamily: "monospace",
									color: isPlayerWhite ? "#111827" : "#e5e7eb",
								}}
							>
								{formatTime(whiteTime || 0)}
							</Text>
						) : (
							<Animated.View
								style={[
									// I am white when isPlayerWhite, black otherwise
									activePlayer === (isPlayerWhite ? "w" : "b") &&
									gameStarted &&
									!gameOver.over
										? activePulseStyle
										: inactivePulseStyle,
								]}
							>
								<Ionicons
									name="infinite"
									size={18}
									color={isPlayerWhite ? "#111827" : "#e5e7eb"}
								/>
							</Animated.View>
						)}
					</View>
				</View>
			</View>

			{/* Move History Strip */}
			<View className="h-12 bg-black/40 border-t border-gray-800">
				<FlatList
					ref={listRef}
					data={
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
							: []
					}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
					keyExtractor={(item) => item.turnNumber.toString()}
					renderItem={({ item }) => {
						const isWhiteSelected = viewingMoveIndex === item.wIndex;
						const isBlackSelected = viewingMoveIndex === item.bIndex;

						return (
							<View className="flex-row items-center mr-4">
								<Text className="text-gray-500 font-mono mr-2 text-xs">
									{item.turnNumber}.
								</Text>
								<TouchableOpacity
									onPress={() => handleNavigation("view", item.wIndex)}
									className={`px-2 py-1 rounded ${
										isWhiteSelected ? "bg-indigo-500" : "bg-transparent hover:bg-gray-800"
									}`}
								>
									<Text
										className={`${
											isWhiteSelected ? "text-white font-bold" : "text-gray-200"
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
												: "bg-transparent hover:bg-gray-800"
										}`}
									>
										<Text
											className={`${
												isBlackSelected ? "text-white font-bold" : "text-gray-200"
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
			<View className="flex-row items-center justify-between px-6 py-4 pb-8 bg-black/20 border-t border-gray-800">
				{/* Resign Button */}
				<Pressable
					onPress={handleResign}
					className="w-12 h-12 rounded-full bg-red-900/30 items-center justify-center overflow-hidden"
					disabled={status !== "active" || gameOver.over}
					android_ripple={{ color: "#996e6eff", foreground: true }}
					hitSlop={10}
				>
					<MaterialIcons
						name="flag"
						size={24}
						color={status !== "active" || gameOver.over ? "gray" : "#ef4444"}
					/>
				</Pressable>

				{/* Navigation Controls */}
				<View className="flex-row items-center bg-gray-800/50 rounded-2xl">
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
				onNewGame={() => {
					router.replace("/challenge-friends");
				}}
				onClose={() => {
					setIsModalVisible(false);
				}}
			/>

			{status === "waiting" && (
				<WaitingOverlay inviteCode={inviteCode} onCancel={handleGoBack} />
			)}
		</ThemedView>
	);
}
