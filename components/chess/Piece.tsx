import { TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { PieceProps } from "@/constants/Types";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
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
	row, // Visual Row
	col, // Visual Col
	squareSize,
	onPress,
	isSelected,
}: PieceProps) {
	const translateX = useSharedValue(col * squareSize);
	const translateY = useSharedValue(row * squareSize);
	const scale = useSharedValue(1);

	useEffect(() => {
		translateX.value = withTiming(col * squareSize, { duration: 200 });
		translateY.value = withTiming(row * squareSize, { duration: 200 });
	}, [col, row, translateX, translateY, squareSize]);

	useEffect(() => {
		if (isSelected) {
			scale.value = withSequence(
				withTiming(1.2, { duration: 100 }),
				withSpring(1, { damping: 50 }),
			);
		} else {
			scale.value = withTiming(1, { duration: 100 });
		}
	}, [isSelected, scale]);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
				{ scale: scale.value },
			],
		};
	});

	return (
		<Animated.View
			style={[
				{
					position: "absolute",
					width: squareSize,
					height: squareSize,
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
				activeOpacity={1}
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
