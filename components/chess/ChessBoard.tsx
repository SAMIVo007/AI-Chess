import { View, Dimensions } from "react-native";
import React, { useRef, useState, useCallback, useEffect } from "react";
import Square, { SQUARE_SIZE } from "./Square";
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

const { width } = Dimensions.get("window");

interface AnimatedPiece {
	id: string;
	type: PieceType;
	color: PieceColor;
	row: number;
	col: number;
}

const getInitialPieces = (
	board: ({ type: PieceType; color: PieceColor } | null)[][]
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
	possibleMoves: Move[]
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

		return (
			<Square
				key={index}
				index={index}
				color={(row + col) % 2 === 0 ? "light" : "dark"}
				row={row}
				col={col}
				onPress={onSquarePress}
				isSelected={isSelected}
				isHighlighted={isHighlighted}
				isCapture={isCapture}
			/>
		);
	});
};

export default function ChessBoard({ orientation = "w" }: BoardProps) {
	// 1. Initialize the game engine
	const gameRef = useRef(new Chess());
	const game = gameRef.current; // Stable reference that persists

	// 2. The Board State: This 8x8 array is the ONLY state needed.
	// It contains objects like { type: 'p', color: 'b' } or null.
	const [board, setBoard] = useState(game.board());
	const [pieces, setPieces] = useState<AnimatedPiece[]>(() =>
		getInitialPieces(game.board())
	);

	// 3. Selection State (for moving)
	const [selectedSquare, setSelectedSquare] = useState<{
		row: number;
		col: number;
	} | null>(null);

	// 4. Possible Moves State
	const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);

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

	const handleSquarePress = useCallback(
		(row: number, col: number) => {
			const currentSelected = selectedSquareRef.current;

			// If we select the same square, deselect
			if (currentSelected?.row === row && currentSelected?.col === col) {
				setSelectedSquare(null);
				setPossibleMoves([]);
				setShowPieceSelector({ show: false, position: 0 });
				return;
			}

			// If we have a selection, try to move there
			if (currentSelected) {
				const from = rowColToSquare(
					currentSelected.row,
					currentSelected.col,
					orientation
				);
				const to = rowColToSquare(row, col, orientation);

				// Check for promotion FIRST
				const moves = game.moves({ verbose: true });
				const isPromotion = moves.find(
					(m) => m.from === from && m.to === to && m.flags.includes("p")
				);

				if (isPromotion) {
					setPendingMove({ from: from as SquareType, to: to as SquareType });
					setShowPieceSelector({ show: true, position: col });
					return;
				}

				try {
					// Try to move in the engine
					const move = game.move({ from, to });

					if (move) {
						// IF VALID: Update the visual board to match the engine
						setBoard(game.board());
						setSelectedSquare(null);
						setPossibleMoves([]);

						// Update Pieces State for Animation
						setPieces((prev) => {
							const next = [...prev];
							// 1. Find the moving piece
							const movingPieceIndex = next.findIndex(
								(p) => p.row === currentSelected.row && p.col === currentSelected.col
							);
							if (movingPieceIndex === -1) return next;

							// 2. Update position
							next[movingPieceIndex] = {
								...next[movingPieceIndex],
								row: row,
								col: col,
							};

							// 3. Handle Capture (Standard & En Passant)
							if (move.flags.includes("e")) {
								// En passant capture
								// The captured pawn is at (fromRow, toCol) - wait, captured piece is at {row: fromRow, col: toCol}?
								// No. En passant: P at e5 captures P at d5. Moves to d6.
								// e5 (4, 4) -> d6 (2, 3).
								// Captured piece is at d5 (3, 3).
								// Captured row is `currentSelected.row` (moving piece row)? No, captured piece is adjacent.
								// Actually better logic: find piece at `to` square first? No, en passant target is empty.
								// Find piece at `to` column and `currentSelected.row`?
								// Yes. Captured pawn is at `row: currentSelected.row`, `col: col`.
								// Wait, `move.to` is (row, col).
								// En passant target rule:
								// If White P moves e5 -> d6.
								// Captured P is at d5.
								// `row` is d6 (index 2). `col` is d (index 3).
								// Captured P is at `index 3` (d5).
								// Row is `row + 1` (since white moves up, index decreases).
								// If black P moves d4 -> e3. index 4 -> 5.
								// Captured P is at e4. `row - 1`.
								// Generic: capture square is `(currentSelected.row, col)`.
								// Because the pawn moves diagonally to the column of the captured pawn.
								// And checking piece at same rank as start.
								// CONFIRMED: Captured piece is at `{ row: currentSelected.row, col: col }`.
								const capturedRow = currentSelected.row;
								const capturedCol = col;
								const capturedIndex = next.findIndex(
									(p) =>
										p.row === capturedRow &&
										p.col === capturedCol &&
										p !== next[movingPieceIndex]
								);
								if (capturedIndex !== -1) next.splice(capturedIndex, 1);
							} else {
								// Standard capture
								// Remove piece at destination
								const capturedIndex = next.findIndex(
									(p) => p.row === row && p.col === col && p !== next[movingPieceIndex]
								);
								if (capturedIndex !== -1) next.splice(capturedIndex, 1);
							}

							// 4. Handle Castling
							if (move.flags.includes("k") || move.flags.includes("q")) {
								const isKingside = move.flags.includes("k");
								const rookRow = currentSelected.row; // Rook is on same rank as King's start
								const rookFromCol = isKingside ? 7 : 0;
								const rookToCol = isKingside ? 5 : 3;

								const rookIndex = next.findIndex(
									(p) => p.row === rookRow && p.col === rookFromCol
								);
								if (rookIndex !== -1) {
									next[rookIndex] = { ...next[rookIndex], col: rookToCol };
								}
							}

							// 5. Handle Promotion
							if (move.flags.includes("p")) {
								next[movingPieceIndex] = {
									...next[movingPieceIndex],
									type: move.promotion as PieceType,
								};
							}

							return next;
						});

						return;
					}
				} catch (e) {
					// Invalid move
				}
			}

			// If no move was made (or just starting), select this square if it has a piece
			const currentBoard = game.board();
			const piece = currentBoard[row][col];
			if (piece) {
				setSelectedSquare({ row, col });
				const square = rowColToSquare(row, col, orientation);
				const moves = game.moves({ square, verbose: true });
				setPossibleMoves(moves);
				setShowPieceSelector({ show: false, position: 0 });
			} else {
				setSelectedSquare(null);
				setPossibleMoves([]);
				setPossibleMoves([]);
				setShowPieceSelector({ show: false, position: 0 });
			}
		},
		[game, orientation]
	);

	return (
		<View style={{ position: "relative" }}>
			{showPieceSelector?.show &&
				(showPieceSelector?.position < 2 ? (
					<View
						style={{
							position: "absolute",
							bottom: SQUARE_SIZE * 8 + 8,
							left: showPieceSelector?.position,
						}}
					>
						<PieceSelector
							color={orientation}
							onPress={(type) => {
								if (pendingMove) {
									game.move({
										from: pendingMove.from,
										to: pendingMove.to,
										promotion: type,
									});
									setBoard(game.board());
									setSelectedSquare(null);
									setPossibleMoves([]);
									setPendingMove(null);

									setPieces((prev) => {
										const next = [...prev];
										const colMap: Record<string, number> = {
											a: 0,
											b: 1,
											c: 2,
											d: 3,
											e: 4,
											f: 5,
											g: 6,
											h: 7,
										};

										const fromColStr = pendingMove.from[0];
										const fromRowStr = pendingMove.from[1];
										const fromCol = colMap[fromColStr];
										const fromRow = 8 - parseInt(fromRowStr);

										const toColStr = pendingMove.to[0];
										const toRowStr = pendingMove.to[1];
										const toCol = colMap[toColStr];
										const toRow = 8 - parseInt(toRowStr);

										const movingPieceIndex = next.findIndex(
											(p) => p.row === fromRow && p.col === fromCol
										);
										if (movingPieceIndex !== -1) {
											next[movingPieceIndex] = {
												...next[movingPieceIndex],
												row: toRow,
												col: toCol,
												type: type, // Promote!
											};

											const capturedIndex = next.findIndex(
												(p) =>
													p.row === toRow && p.col === toCol && p !== next[movingPieceIndex]
											);
											if (capturedIndex !== -1) next.splice(capturedIndex, 1);
										}
										return next;
									});
								}
								setShowPieceSelector({ show: false, position: 0 });
							}}
						/>
					</View>
				) : (
					<View
						style={{
							position: "absolute",
							bottom: SQUARE_SIZE * 8 + 8,
							right: showPieceSelector?.position,
						}}
					>
						<PieceSelector
							color={orientation}
							onPress={(type) => {
								if (pendingMove) {
									game.move({
										from: pendingMove.from,
										to: pendingMove.to,
										promotion: type,
									});
									setBoard(game.board());
									setSelectedSquare(null);
									setPossibleMoves([]);
									setPendingMove(null);

									setPieces((prev) => {
										const next = [...prev];
										const colMap: Record<string, number> = {
											a: 0,
											b: 1,
											c: 2,
											d: 3,
											e: 4,
											f: 5,
											g: 6,
											h: 7,
										};

										const fromColStr = pendingMove.from[0];
										const fromRowStr = pendingMove.from[1];
										const fromCol = colMap[fromColStr];
										const fromRow = 8 - parseInt(fromRowStr);

										const toColStr = pendingMove.to[0];
										const toRowStr = pendingMove.to[1];
										const toCol = colMap[toColStr];
										const toRow = 8 - parseInt(toRowStr);

										const movingPieceIndex = next.findIndex(
											(p) => p.row === fromRow && p.col === fromCol
										);
										if (movingPieceIndex !== -1) {
											next[movingPieceIndex] = {
												...next[movingPieceIndex],
												row: toRow,
												col: toCol,
												type: type, // Promote!
											};

											const capturedIndex = next.findIndex(
												(p) =>
													p.row === toRow && p.col === toCol && p !== next[movingPieceIndex]
											);
											if (capturedIndex !== -1) next.splice(capturedIndex, 1);
										}
										return next;
									});
								}
								setShowPieceSelector({ show: false, position: 0 });
							}}
						/>
					</View>
				))}
			<View
				style={{
					position: "relative",
					flexDirection: "row",
					flexWrap: "wrap",
					width: width,
					height: width,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{/* Squares */}
				{renderSquares(
					orientation,
					handleSquarePress,
					selectedSquare,
					possibleMoves
				)}

				{/* Pieces */}
				{pieces.map((piece) => (
					<Piece
						key={piece.id}
						type={piece.type}
						color={piece.color}
						// Adjust visual row/col based on board orientation
						row={orientation === "w" ? piece.row : 7 - piece.row}
						col={orientation === "w" ? piece.col : 7 - piece.col}
						onPress={handleSquarePress}
						position={rowColToSquare(piece.row, piece.col, orientation)}
						isSelected={
							selectedSquare?.row === piece.row && selectedSquare?.col === piece.col
						}
					/>
				))}
			</View>
		</View>
	);
}
