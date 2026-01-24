import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import { PieceImageMap } from "./Piece";
import { PieceColor, PieceType } from "chess.js";

interface CapturedPiecesProps {
	captured: PieceType[];
	color: PieceColor;
}

const PIECE_VALUES: Record<string, number> = {
	p: 1,
	n: 3,
	b: 3,
	r: 5,
	q: 9,
};

export const CapturedPieces = ({ captured, color }: CapturedPiecesProps) => {
	// Normalize to lowercase for counting
	const normalizedPieces = captured.map((p) => p.toLowerCase());

	// Count pieces
	const counts: Record<string, number> = {};
	let totalValue = 0;

	normalizedPieces.forEach((p) => {
		counts[p] = (counts[p] || 0) + 1;
		totalValue += PIECE_VALUES[p] || 0;
	});

	// Order: Pawn, Knight, Bishop, Rook, Queen
	const order = ["p", "n", "b", "r", "q"] as PieceType[];

	return (
		<View style={styles.container}>
			{order.map((piece) => {
				const count = counts[piece] || 0;
				if (count === 0) return null;

				return (
					<View key={piece} style={styles.pieceGroup}>
						{Array.from({ length: count }).map((_, i) => (
							<Image
								key={`${piece}-${i}`}
								style={{ width: 16, height: 16, marginLeft: i > 0 ? -10 : 0 }} // Overlap effect
								source={PieceImageMap[color][piece]}
								contentFit="cover"
							/>
						))}
					</View>
				);
			})}
			{/* Can optionally show material score difference here */}
			<Text style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>
				+{totalValue}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		height: 18,
	},
	pieceGroup: {
		flexDirection: "row",
	},
});
