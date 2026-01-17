import { Piece, PieceColor, Square } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Convert row/col to chess square (e.g., row=6, col=0 → "a2")
export function rowColToSquare(
	row: number,
	col: number,
	orientation: PieceColor
): Square {
	const file = orientation === "w" ? FILES[col] : FILES[7 - col];
	const rank = orientation === "w" ? RANKS[row] : RANKS[7 - row];
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
		return { row: 7 - rankIndex, col: 7 - fileIndex };
	}
}
