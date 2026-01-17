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
						return;
					}
				} catch (e) {
					// Invalid move
				}
			}

			// If no move was made (or just starting), select this square if it has a piece
			// We need to access the LATEST board, but board is State.
			// Ideally we read from game.board() directly to ensure we have latest data?
			// But board state is driven by game.board().
			// Accessing state inside callback without dep check?
			// We can use game.board() since game is a Ref!
			const currentBoard = game.board();
			const piece = currentBoard[row][col];
			if (piece) {
				setSelectedSquare({ row, col });
				// Calculate valid moves only for this piece
				const square = rowColToSquare(row, col, orientation);
				const moves = game.moves({ square, verbose: true });
				setPossibleMoves(moves);
				setShowPieceSelector({ show: false, position: 0 });
			} else {
				// Clicked empty square but not a move -> Clear selection and moves
				// (handled by 'if (currentSelected)' move attempt failing or not existing...
				// actually if we click empty square with NO selection, we get here.
				// We should clear if we clicked empty space?)
				// No, the original logic just did nothing. We can keep it that way or explicit clear.
				// Best to keep current behavior: if clicked empty space with nothing selected, do nothing.
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
				{board.map((row, rowIndex) => {
					return row.map((piece, colIndex) => {
						if (piece) {
							return (
								<Piece
									key={`${rowIndex}-${colIndex}`}
									type={piece.type}
									color={
										orientation === "w" ? piece.color : piece.color === "w" ? "b" : "w"
									}
									row={rowIndex}
									col={colIndex}
									position={rowColToSquare(rowIndex, colIndex, orientation)}
									onPress={handleSquarePress}
								/>
							);
						}
						return null;
					});
				})}
			</View>
		</View>
	);
}
