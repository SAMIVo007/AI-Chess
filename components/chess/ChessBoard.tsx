import { View, Dimensions } from "react-native";
import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	useImperativeHandle,
	forwardRef,
} from "react";
import Square from "./Square";
import Piece from "./Piece";
import { BoardProps, PieceProps, PromotionPieceType } from "@/constants/Types";
import {
	PieceColor,
	PieceType,
	Chess,
	Move,
	Square as SquareType,
} from "chess.js";
import { rowColToSquare } from "@/utils/chessUtils";
import PieceSelector from "./PieceSelector";

// Define what methods the parent can call on this board
export interface ChessBoardRef {
	move: (
		from: SquareType,
		to: SquareType,
		promotion?: PromotionPieceType,
	) => void;
	reset: (fen?: string) => void;
	undo: () => void;
	highlightLastMove: (from: string, to: string) => void;
}

interface AnimatedPiece {
	id: string;
	type: PieceType;
	color: PieceColor;
	row: number;
	col: number;
}

const getInitialPieces = (
	board: ({ type: PieceType; color: PieceColor } | null)[][],
) => {
	const pieces: AnimatedPiece[] = [];
	board.forEach((row, rowIndex) => {
		row.forEach((piece, colIndex) => {
			if (piece) {
				pieces.push({
					id: `${piece.color}-${piece.type}-${rowIndex}-${colIndex}`, // Initial stable ID
					type: piece.type,
					color: piece.color,
					row: rowIndex,
					col: colIndex,
				});
			}
		});
	});
	return pieces;
};

const renderSquares = (
	orientation: PieceColor,
	onSquarePress: (row: number, col: number) => void,
	selectedSquare: { row: number; col: number } | null,
	possibleMoves: Move[],
	squareSize: number,
	lastMove: { from: string; to: string } | null,
) => {
	return Array.from({ length: 64 }).map((_, index) => {
		const row =
			orientation === "w" ? Math.floor(index / 8) : 7 - Math.floor(index / 8);
		const col = orientation === "w" ? index % 8 : 7 - (index % 8);
		const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
		const squareName = rowColToSquare(row, col, orientation);

		const move = possibleMoves.find((m) => m.to === squareName);
		const isHighlighted = !!move;
		const isCapture = move?.flags.includes("c") || move?.flags.includes("e"); // c = capture, e = en passant
		const isLastMove = lastMove
			? squareName === lastMove.from || squareName === lastMove.to
			: false;

		return (
			<Square
				key={index}
				index={index}
				color={(row + col) % 2 === 0 ? "light" : "dark"}
				row={row}
				col={col}
				squareSize={squareSize}
				onPress={onSquarePress}
				isSelected={isSelected}
				isHighlighted={isHighlighted}
				isCapture={isCapture}
				isLastMove={isLastMove}
			/>
		);
	});
};

const ChessBoard = forwardRef<ChessBoardRef, BoardProps>(
	({ orientation = "w", onMove, interactive = true }, ref) => {
		// Self-measure: use onLayout to get the actual available width
		const [boardSize, setBoardSize] = useState(0);
		const squareSize = Math.floor(boardSize / 8);
		const adjustedBoardSize = squareSize * 8;

		// 1. Initialize the game engine
		const gameRef = useRef(new Chess());
		const game = gameRef.current; // Stable reference that persists

		// 2. The Board State: This 8x8 array is the ONLY state needed.
		// It contains objects like { type: 'p', color: 'b' } or null.
		const [board, setBoard] = useState(game.board());
		const [pieces, setPieces] = useState<AnimatedPiece[]>(() =>
			getInitialPieces(game.board()),
		);

		// 3. Selection State (for moving)
		const [selectedSquare, setSelectedSquare] = useState<{
			row: number;
			col: number;
		} | null>(null);

		// 4. Possible Moves State
		const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);

		// 5. Last Move State (for highlighting)
		const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
			null,
		);

		// 5. Promotion State

		const [showPieceSelector, setShowPieceSelector] = useState({
			show: false,
			position: 0,
		});

		const [pendingMove, setPendingMove] = useState<{
			from: SquareType;
			to: SquareType;
		} | null>(null);

		// Ref to access state inside useCallback without re-creating it
		const selectedSquareRef = useRef(selectedSquare);
		useEffect(() => {
			selectedSquareRef.current = selectedSquare;
		}, [selectedSquare]);

		// --- LOGIC: INTERNAL MOVE HANDLER (Reusable) ---
		const executeMove = useCallback(
			(from: SquareType, to: SquareType, promotion?: PromotionPieceType) => {
				try {
					const move = game.move({ from, to, promotion });
					if (move) {
						// 1. Logic Updates
						setBoard(game.board());
						setSelectedSquare(null);
						setPossibleMoves([]);
						setPendingMove(null); // Clear any pending promotion

						// 2. Animation Updates (The complex reducer logic)
						setPieces((prev) => {
							const next = [...prev];

							// Helper to parse 'e4' to {row, col} depending on NO orientation (logic uses standard indices)
							// Wait, your animation logic relied on Visual Row/Col or Logical Row/Col?
							// Your state logic uses standard array indices (0-7), independent of orientation. Good.

							// We need to find coordinates for 'from' and 'to' strings
							const parseSquare = (sq: string) => {
								const colFile = sq[0]; // 'e'
								const rowRank = sq[1]; // '4'
								const colIndex = "abcdefgh".indexOf(colFile);
								const rowIndex = 8 - parseInt(rowRank);
								return { row: rowIndex, col: colIndex };
							};

							const start = parseSquare(move.from);
							const end = parseSquare(move.to);

							const movingPieceIndex = next.findIndex(
								(p) => p.row === start.row && p.col === start.col,
							);
							if (movingPieceIndex === -1) return next; // Should not happen

							// Update Position
							next[movingPieceIndex] = {
								...next[movingPieceIndex],
								row: end.row,
								col: end.col,
								type: move.promotion
									? (move.promotion as PieceType)
									: next[movingPieceIndex].type,
							};

							// Handle Captures
							if (move.flags.includes("e")) {
								// En Passant: capture is at {row: start.row, col: end.col}
								const capturedIndex = next.findIndex(
									(p) => p.row === start.row && p.col === end.col,
								);
								if (capturedIndex !== -1) next.splice(capturedIndex, 1);
							} else if (move.captured) {
								// Standard capture at destination
								const capturedIndex = next.findIndex(
									(p) =>
										p.row === end.row &&
										p.col === end.col &&
										p !== next[movingPieceIndex],
								);
								if (capturedIndex !== -1) next.splice(capturedIndex, 1);
							}

							// Handle Castling
							if (move.san === "O-O" || move.san === "O-O-O") {
								// Logic for rook movement
								const isKingside = move.san === "O-O";
								const rookStartCol = isKingside ? 7 : 0;
								const rookEndCol = isKingside ? 5 : 3;
								const row = start.row; // 0 for black, 7 for white

								const rookIndex = next.findIndex(
									(p) => p.row === row && p.col === rookStartCol,
								);
								if (rookIndex !== -1) {
									next[rookIndex] = { ...next[rookIndex], col: rookEndCol };
								}
							}

							return next;
						});

						// Track last move for highlighting
						setLastMove({ from: move.from, to: move.to });

						return move;
					}
				} catch (e) {
					console.log("Move failed internally", e);
				}
				return null;
			},
			[game],
		);

		// --- EXPOSE METHODS TO PARENT ---
		useImperativeHandle(ref, () => ({
			move: (
				from: SquareType,
				to: SquareType,
				promotion: PromotionPieceType = "q",
			) => {
				// Called by Stockfish or Supabase
				// AI/Auto moves usually specify promotion or default to Queen
				executeMove(from, to, promotion);
			},
			reset: (fen?: string) => {
				game.reset();
				if (fen) game.load(fen);
				setBoard(game.board());
				setPieces(getInitialPieces(game.board()));
				setSelectedSquare(null);
				setPossibleMoves([]);
				// Recompute last move from game history after reset
				const history = game.history({ verbose: true });
				if (history.length > 0) {
					const last = history[history.length - 1];
					setLastMove({ from: last.from, to: last.to });
				} else {
					setLastMove(null);
				}
			},
			undo: () => {
				game.undo();
				setBoard(game.board());
				setPieces(getInitialPieces(game.board())); // Lazy undo: just reset pieces from board
				// Update last move after undo
				const history = game.history({ verbose: true });
				if (history.length > 0) {
					const last = history[history.length - 1];
					setLastMove({ from: last.from, to: last.to });
				} else {
					setLastMove(null);
				}
			},
			highlightLastMove: (from: string, to: string) => {
				setLastMove({ from, to });
			},
		}));

		// --- USER INTERACTION HANDLER ---
		const handleSquarePress = useCallback(
			(row: number, col: number) => {
				if (!interactive) return;

				const currentSelected = selectedSquareRef.current;

				// 1. Clicked same square -> Deselect
				if (currentSelected?.row === row && currentSelected?.col === col) {
					setSelectedSquare(null);
					setPossibleMoves([]);
					setShowPieceSelector({ show: false, position: 0 });
					return;
				}

				// 2. Try Move
				if (currentSelected) {
					const from = rowColToSquare(
						currentSelected.row,
						currentSelected.col,
						orientation,
					);
					const to = rowColToSquare(row, col, orientation);

					// Check Promotion
					const moves = game.moves({ verbose: true });
					const isPromotion = moves.find(
						(m) => m.from === from && m.to === to && m.flags.includes("p"),
					);

					if (isPromotion) {
						setPendingMove({ from: from as SquareType, to: to as SquareType });
						setShowPieceSelector({ show: true, position: col });
						return;
					}

					// Execute Move
					const moveResult = executeMove(from, to);
					if (moveResult) {
						// Notify Parent!
						if (onMove) onMove(moveResult);
						return;
					}
				}

				// 3. Select Piece
				const currentBoard = game.board();
				const piece = currentBoard[row][col];
				const isMyPiece = piece?.color === orientation;

				if (piece && isMyPiece) {
					setSelectedSquare({ row, col });
					const square = rowColToSquare(row, col, orientation);
					const moves = game.moves({ square, verbose: true });
					setPossibleMoves(moves);
					setShowPieceSelector({ show: false, position: 0 });
				} else {
					setSelectedSquare(null);
					setPossibleMoves([]);
					setShowPieceSelector({ show: false, position: 0 });
				}
			},
			[game, orientation, executeMove, onMove],
		);

		// --- PROMOTION HANDLER ---
		const handlePromotionSelect = (type: PromotionPieceType) => {
			if (pendingMove) {
				const moveResult = executeMove(pendingMove.from, pendingMove.to, type);
				if (moveResult && onMove) onMove(moveResult);
			}
			setShowPieceSelector({ show: false, position: 0 });
		};

		return (
			<View
				style={{ width: "100%", aspectRatio: 1, alignItems: "center" }}
				onLayout={(e) => {
					const w = e.nativeEvent.layout.width;
					if (w > 0 && w !== boardSize) setBoardSize(w);
				}}
			>
				{boardSize > 0 && (
					<View style={{ position: "relative" }}>
						{showPieceSelector?.show && (
							<View
								style={{
									position: "absolute",
									bottom: squareSize * 8 + 8,
									left:
										showPieceSelector.position < 4
											? showPieceSelector.position * squareSize
											: undefined,
									right:
										showPieceSelector.position >= 4
											? (7 - showPieceSelector.position) * squareSize
											: undefined,
									zIndex: 20,
								}}
							>
								<PieceSelector
									color={orientation}
									squareSize={squareSize}
									onPress={handlePromotionSelect}
								/>
							</View>
						)}
						<View
							style={{
								position: "relative",
								flexDirection: "row",
								flexWrap: "wrap",
								width: adjustedBoardSize,
								height: adjustedBoardSize,
							}}
						>
							{/* Squares */}
							{renderSquares(
								orientation,
								handleSquarePress,
								selectedSquare,
								possibleMoves,
								squareSize,
								lastMove,
							)}

							{/* Pieces */}
							{pieces.map((piece) => (
								<Piece
									key={piece.id}
									type={piece.type}
									color={piece.color}
									row={orientation === "w" ? piece.row : 7 - piece.row}
									col={orientation === "w" ? piece.col : 7 - piece.col}
									squareSize={squareSize}
									onPress={() => handleSquarePress(piece.row, piece.col)}
									position={rowColToSquare(piece.row, piece.col, orientation)}
									isSelected={
										selectedSquare?.row === piece.row && selectedSquare?.col === piece.col
									}
								/>
							))}
						</View>
					</View>
				)}
			</View>
		);
	},
);

export default ChessBoard;
