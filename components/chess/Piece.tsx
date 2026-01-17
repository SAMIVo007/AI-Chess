import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { PieceProps } from "@/constants/Types";
import { SQUARE_SIZE } from "./Square";

const PieceImageMap = {
	w: {
		p: require("@/assets/pieces/pawn-w.svg"),
		n: require("@/assets/pieces/knight-w.svg"),
		b: require("@/assets/pieces/bishop-w.svg"),
		r: require("@/assets/pieces/rook-w.svg"),
		q: require("@/assets/pieces/queen-w.svg"),
		k: require("@/assets/pieces/king-w.svg"),
	},
	b: {
		p: require("@/assets/pieces/pawn-b.svg"),
		n: require("@/assets/pieces/knight-b.svg"),
		b: require("@/assets/pieces/bishop-b.svg"),
		r: require("@/assets/pieces/rook-b.svg"),
		q: require("@/assets/pieces/queen-b.svg"),
		k: require("@/assets/pieces/king-b.svg"),
	},
};

export default function Piece({ color, type, row, col }: PieceProps) {
	const [pressed, setPressed] = useState(false);
	const handlePress = () => {
		setPressed((prev) => !prev);
		setTimeout(() => {
			setPressed((prev) => !prev);
		}, 100);
	};

	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={handlePress}
			style={{
				position: "absolute", 
				width: SQUARE_SIZE,
				height: SQUARE_SIZE,
				left: col * SQUARE_SIZE,
				top: row * SQUARE_SIZE,
				justifyContent: "center",
				alignItems: "center",
				zIndex: 10,
				transform: [{ scale: pressed ? 1.1 : 1 }],
				// borderColor: "red",
				// borderWidth: 1,
			}}
		>
			<Image
				style={styles.image}
				source={PieceImageMap[color][type]}
				contentFit="cover"
			/>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	image: {
		flex: 1,
		width: "100%",
	},
});
