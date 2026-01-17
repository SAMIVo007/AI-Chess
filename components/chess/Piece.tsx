import { TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { PieceProps } from "@/constants/Types";
import { SQUARE_SIZE } from "./Square";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

export const PieceImageMap = {
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

export default React.memo(function Piece({
	color,
	type,
	row,
	col,
	onPress,
}: PieceProps) {
	const translateX = useSharedValue(col * SQUARE_SIZE);
	const translateY = useSharedValue(row * SQUARE_SIZE);

	useEffect(() => {
		translateX.value = withTiming(col * SQUARE_SIZE, { duration: 300 });
		translateY.value = withTiming(row * SQUARE_SIZE, { duration: 300 });
	}, [col, row, translateX, translateY]);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
			],
		};
	});

	return (
		<Animated.View
			style={[
				{
					position: "absolute",
					width: SQUARE_SIZE,
					height: SQUARE_SIZE,
					justifyContent: "center",
					alignItems: "center",
					zIndex: 10,
					top: 0,
					left: 0,
				},
				animatedStyle,
			]}
		>
			<TouchableOpacity
				activeOpacity={0.8}
				onPress={() => onPress?.(row, col)}
				style={{ width: "100%", height: "100%" }}
			>
				<Image
					style={{ flex: 1, width: "100%" }}
					source={PieceImageMap[color][type]}
					contentFit="cover"
				/>
			</TouchableOpacity>
		</Animated.View>
	);
});
