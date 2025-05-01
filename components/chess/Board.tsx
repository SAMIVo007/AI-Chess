import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { Chess } from "chess.js";
import Background from "./Background";
import Piece from "./Piece";
import { toTranslation, SIZE, toPosition, Position } from "./Notation";
import { speakMove } from "@/utils/voice";
import { startEngine, stopEngine, analyzePosition } from "../../utils/ai";

export default function Board() {
	const chess = useRef(new Chess());
	const [state, setState] = useState({
		player: "w",
		board: chess.current.board(),
	});

	const onTurn = useCallback(() => {
		const lastMove = chess.current.history({ verbose: true }).at(-1);
		if (lastMove) {
			const pieceMap = {
				p: "Pawn",
				n: "Knight",
				b: "Bishop",
				r: "Rook",
				q: "Queen",
				k: "King",
			};

			const piece = pieceMap[lastMove.piece];
			const from = lastMove.from.toUpperCase();
			const to = lastMove.to.toUpperCase();
			const sentence = `${piece} moved from ${from} to ${to}`;
			speakMove(sentence); // voice output

			setState({
				player: state.player === "w" ? "b" : "w",
				board: chess.current.board(),
			});

			// If it's now black's turn (assuming Stockfish plays black)
			if (state.player === "w") {
				// Analyze the current position for Stockfish's move
				analyzePosition(chess.current.fen());
			}
		}
	}, [chess, state.player]);

	useEffect(() => {
		const handleEngineOutput = (line: string) => {
			if (line.startsWith("bestmove")) {
				const bestMove = line.split(" ")[1];
				if (bestMove && bestMove !== "(none)") {
					// ←— Insert your auto-move here:
					chess.current.move({
						from: bestMove.slice(0, 2) as Position,
						to: bestMove.slice(2, 4) as Position,
						promotion: "q",
					});
					setState({
						player: "w", // now it’s back to the human player
						board: chess.current.board(), // refresh the board array
					});

					// (Optional) speak the AI’s move:
					const from = bestMove.slice(0, 2).toUpperCase();
					const to = bestMove.slice(2, 4).toUpperCase();
					speakMove(`AI moves from ${from} to ${to}`);
				}
			}
		};

		startEngine(handleEngineOutput);
		return () => {
			stopEngine();
		};
	}, []);

	return (
		<View className="flex-1 w-full h-auto aspect-square">
			<Background />
			{state.board.map((row, i) =>
				row.map((square, j) => {
					if (square === null) {
						return null;
					}
					return (
						<Piece
							key={`${i}-${j}`}
							id={`${square.color}${square.type}` as const}
							position={{ x: j * SIZE, y: i * SIZE }}
							chess={chess.current}
							onTurn={onTurn}
							enabled={state.player === square.color}
						/>
					);
				})
			)}
		</View>
	);
}
