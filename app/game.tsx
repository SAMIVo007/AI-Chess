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
	const params = useLocalSearchParams<{
		levelSelected: string;
		timeSelected: string;
	}>();

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

	// Voice toggle (optional)
	const [voiceOn, setVoiceOn] = useState(true);

	// clocks
	const [whiteTime, setWhiteTime] = useState(300);
	const [blackTime, setBlackTime] = useState(300);

	const chessRef = useRef<ChessboardRef>(null);
	const listRef = useRef<FlatList<string>>(null);

	useEffect(() => {
		const { levelSelected, timeSelected } = params;

		if (levelSelected) {
			console.log("AI Difficulty Level:", levelSelected);
		}
		if (timeSelected) {
			console.log("Time Control (seconds):", timeSelected);
			const timeInSeconds = parseInt(timeSelected, 10);
			setWhiteTime(timeInSeconds);
			setBlackTime(timeInSeconds);
		}
	}, [params]);

	const onUserMove = (info: ChessMoveInfo) => {
		const { from, to, promotion } = info.move;
		const { levelSelected } = params;

		// Update the game instance with the move
		game.move({
			from: from,
			to: to,
			promotion: promotion || undefined,
		});

		// Update the FEN state
		setFen(game.fen());

		// Update history
		setHistory(game.history());

		const { fen, game_over, in_check, in_checkmate, in_draw, in_stalemate } =
			info.state;

		const activeColor = fen.split(" ")[1]; // "b" or "w"
		console.log("Active color:", activeColor);

		// Then ask Stockfish to think...
		if (!game_over && activeColor === "b") {
			analyzePosition(info.state.fen, parseInt(levelSelected, 10) || 1);
		}

		// Game over logic
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
		game.undo();

		// Update the FEN state to reflect the new board position
		setFen(game.fen());

		// Update the history
		setHistory(game.history());

		// Update the board display
		if (chessRef.current) {
			chessRef.current.resetBoard(game.fen());
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
	const rematch = () => {
		setHistory([]);

		setGameOver({ over: false, resultText: "", winner: null });

		setGameKey((k) => k + 1);

		// Reset time based on initial params if available, otherwise default
		const initialTime = params.timeSelected
			? parseInt(params.timeSelected, 10)
			: 300;
		setWhiteTime(initialTime);
		setBlackTime(initialTime);
	};

	useEffect(() => {
		const initializeGame = async () => {
			const onLine = async (line: string) => {
				console.log("Stockfish →", line);
				if (line.startsWith("bestmove")) {
					const uci = line.split(" ")[1];

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

						// Update state
						setFen(game.fen());
						// setHistory(game.history());

						// Voice feedback
						if (voiceOn) {
							speakMove(moveDescription);
						}
					}
				}
			};

			// start the engine + listener
			await startEngine(onLine);
		};
		initializeGame();

		return () => {
			stopEngine();
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
					<MaterialIcons name="arrow-back-ios" size={24} color="#333" />
				</TouchableOpacity>
				<Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Current Game
				</Text>
				<TouchableOpacity className="p-2">
					<MaterialIcons name="settings" size={24} color="#333" />
				</TouchableOpacity>
			</View>

			{/* Players & Clocks */}
			<View className="flex-row justify-between px-6 mb-4">
				{/* White */}
				<View className="items-center">
					<Image
						source={{
							uri: "https://www.shutterstock.com/image-vector/young-smiling-man-avatar-brown-600nw-2261401207.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						Alice
					</Text>
					<View className="mt-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow">
						<Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
							{formatTime(whiteTime)}
						</Text>
					</View>
				</View>

				{/* Black */}
				<View className="items-center">
					<Image
						source={{
							uri: "https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg",
						}}
						className="rounded-full"
						style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
					/>
					<Text className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
						Bob
					</Text>
					<View className="mt-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow">
						<Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
							{formatTime(blackTime)}
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
					gestureEnabled={true}
					onMove={onUserMove}
					durations={{ move: 150 }}
					colors={{
						white: "#f0d9b5",
						black: "#b4855e",
					}}
				/>
			</View>

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
					getItemLayout={(data, index) =>
						// Assuming each item has roughly the same width for horizontal list
						// You'll need to estimate or calculate itemWidth + marginRight
						({ length: 100, offset: 100 * index, index }) // Replace 100 with actual item width + margin
					}
				/>
			</View>

			{/* Bottom Controls */}
			<View className="flex-row justify-around items-center py-3 border-t border-gray-200 dark:border-gray-700">
				<TouchableOpacity onPress={() => setVoiceOn((v) => !v)} className="p-2">
					<FontAwesome5
						name={voiceOn ? "volume-up" : "volume-mute"}
						size={24}
						color={voiceOn ? "#4caf50" : "#999"}
					/>
				</TouchableOpacity>
				<TouchableOpacity className="p-2" onPress={handleUndo}>
					<MaterialIcons name="undo" size={28} color="#333" />
				</TouchableOpacity>
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
		</ThemedView>
	);
}
