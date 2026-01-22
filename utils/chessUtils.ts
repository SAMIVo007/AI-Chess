import { Piece, PieceColor, Square } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Convert row/col to chess square (e.g., row=6, col=0 → "a2")
export function rowColToSquare(
	row: number,
	col: number,
	orientation: PieceColor
): Square {
	// row/col are already logical board coordinates (0,0 is a8)
	// We ignore orientation because the caller (renderSquares) handles the visual flip
	const file = FILES[col];
	const rank = RANKS[row];
	return (file + rank) as Square;
}

// Convert chess square to row/col (e.g., "e4" → { row: 4, col: 4 } for white)
export function squareToRowCol(
	square: Square,
	orientation: PieceColor
): { row: number; col: number } {
	const file = square[0]; // 'a'-'h'
	const rank = square[1]; // '1'-'8'

	const fileIndex = FILES.indexOf(file); // 0-7
	const rankIndex = RANKS.indexOf(rank); // 0-7 (where '8' is 0, '1' is 7)

	if (orientation === "w") {
		return { row: rankIndex, col: fileIndex };
	} else {
		// This conversion is likely also problematic if we want absolute coordinates
		// But let's verify usage. If we assume this returns logical coordinates:
		return { row: rankIndex, col: fileIndex };
	}
}
