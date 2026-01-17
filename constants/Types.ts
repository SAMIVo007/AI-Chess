import { PieceType, PieceColor, SquareColor, Square } from "chess.js";

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
	orientation: PieceColor;
}

export interface PieceProps {
	color: PieceColor;
	type: PieceType;
	position: Square;
	row: number;
	col: number;
}

export interface BoardProps {
	orientation: PieceColor;
}
