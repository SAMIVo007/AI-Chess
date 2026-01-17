import { PieceType, PieceColor, SquareColor, Square } from "chess.js";

export type PromotionPieceType = "q" | "r" | "b" | "n";

export interface Friend {
	id: string;
	username: string;
	email: string;
	last_seen: string;
	status: "online" | "offline";
}

export interface Game {
	id: string;
	created_at: string;
	fen: string;
	white_player_id: string | null;
	black_player_id: string | null;
	pgn: string;
	status: "pending" | "waiting" | "active" | "completed";
	winner_id: string | null;
	expires_at: string;
	invite_code: string;
	turn: PieceColor;
}

export interface GameInvite {
	id: string; // gameId
	invite_code: string;
	created_at: string;
	expires_at: string;
	status: "pending" | "waiting" | "active" | "completed";
}

export interface SquareProps {
	color: SquareColor;
	row: number;
	col: number;
	index: number;
	isSelected?: boolean;
	isHighlighted?: boolean;
	isCapture?: boolean;
	onPress?: (row: number, col: number) => void;
}

export interface PieceProps {
	color: PieceColor;
	type: PieceType;
	position: Square;
	row: number;
	col: number;
	onPress?: (row: number, col: number) => void;
	isSelected?: boolean;
}

export interface PieceSelectorProps {
	color: PieceColor;
	onPress?: (type: PromotionPieceType) => void;
}

export interface BoardProps {
	orientation: PieceColor;
}
