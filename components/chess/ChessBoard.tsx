import { View, Dimensions } from "react-native";
import React, { useRef, useState } from "react";
import Square from "./Square";
import Piece from "./Piece";
import { BoardProps, PieceProps } from "@/constants/Types";
import { PieceColor, PieceType, Chess, Move } from "chess.js";
import { rowColToSquare } from "@/utils/chessUtils";

const { width } = Dimensions.get("window");

const renderSquares = (orientation: PieceColor) => {
	return Array.from({ length: 64 }).map((_, index) => {
		const row = Math.floor(index / 8);
		const col = index % 8;
		return (
			<Square
				key={index}
				index={index}
				color={(row + col) % 2 === 0 ? "light" : "dark"}
				row={row}
				col={col}
				orientation={orientation}
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

	const handleSquarePress = (row: number, col: number) => {
		// If we select the same square, deselect
		if (selectedSquare?.row === row && selectedSquare?.col === col) {
			setSelectedSquare(null);
			return;
		}

		// If we have a selection, try to move there
		if (selectedSquare) {
			const from = rowColToSquare(
				selectedSquare.row,
				selectedSquare.col,
				orientation
			);
			const to = rowColToSquare(row, col, orientation);

			try {
				// Try to move in the engine
				const move = game.move({ from, to, promotion: "q" }); // auto-promote to queen for now

				if (move) {
					// IF VALID: Update the visual board to match the engine
					setBoard(game.board());
					setSelectedSquare(null);
					return;
				}
			} catch (e) {
				// Invalid move
			}
		}

		// If no move was made (or just starting), select this square if it has a piece
		const piece = board[row][col];
		if (piece) {
			setSelectedSquare({ row, col });
		}
	};

	return (
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
			{renderSquares(orientation)}

			{/* Pieces */}
			<Piece {...whitePawn1} />
			<Piece {...whitePawn2} />
			<Piece {...whitePawn3} />
			<Piece {...whitePawn4} />
			<Piece {...whitePawn5} />
			<Piece {...whitePawn6} />
			<Piece {...whitePawn7} />
			<Piece {...whitePawn8} />
			<Piece {...whiteRook1} />
			<Piece {...whiteRook2} />
			<Piece {...whiteKnight1} />
			<Piece {...whiteKnight2} />
			<Piece {...whiteBishop1} />
			<Piece {...whiteBishop2} />
			<Piece {...whiteQueen} />
			<Piece {...whiteKing} />
			<Piece {...blackPawn1} />
			<Piece {...blackPawn2} />
			<Piece {...blackPawn3} />
			<Piece {...blackPawn4} />
			<Piece {...blackPawn5} />
			<Piece {...blackPawn6} />
			<Piece {...blackPawn7} />
			<Piece {...blackPawn8} />
			<Piece {...blackRook1} />
			<Piece {...blackRook2} />
			<Piece {...blackKnight1} />
			<Piece {...blackKnight2} />
			<Piece {...blackBishop1} />
			<Piece {...blackBishop2} />
			<Piece {...blackQueen} />
			<Piece {...blackKing} />
		</View>
	);
}
