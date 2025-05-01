import { View, Text, ImageSourcePropType } from "react-native";
import { ChessInstance } from "chess.js";
import React, { useCallback, useEffect } from "react";
import { StyleSheet, Image } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	useAnimatedGestureHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { move, Vector } from "react-native-redash";

import { toTranslation, SIZE, toPosition } from "./Notation";

type Position = `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8}`;

type Player = "b" | "w";
type Type = "q" | "r" | "n" | "b" | "k" | "p";
type Piece = `${Player}${Type}`;
type Pieces = Record<Piece, ReturnType<typeof require>>;
export const PIECES: Pieces = {
	br: require("../../assets/pieces/br.png"),
	bp: require("../../assets/pieces/bp.png"),
	bn: require("../../assets/pieces/bn.png"),
	bb: require("../../assets/pieces/bb.png"),
	bq: require("../../assets/pieces/bq.png"),
	bk: require("../../assets/pieces/bk.png"),
	wr: require("../../assets/pieces/wr.png"),
	wn: require("../../assets/pieces/wn.png"),
	wb: require("../../assets/pieces/wb.png"),
	wq: require("../../assets/pieces/wq.png"),
	wk: require("../../assets/pieces/wk.png"),
	wp: require("../../assets/pieces/wp.png"),
};

interface PieceProps {
	id: Piece;
	position: Vector;
	chess: ChessInstance;
	onTurn: () => void;
	enabled: boolean;
}

export default function Piece({
	id,
	position,
	chess,
	onTurn,
	enabled,
}: PieceProps) {
	const isGestureActive = useSharedValue(false);
	const offsetX = useSharedValue(0);
	const offsetY = useSharedValue(0);
	const translateX = useSharedValue(position.x);
	const translateY = useSharedValue(position.y);

	const movePiece = useCallback(
		(from: Position, to: Position) => {
			const move = chess
				.moves({ verbose: true })
				.find((m: { from: any; to: any }) => m.from === from && m.to === to);

			const { x, y } = toTranslation(move ? to : from);

			translateX.value = withTiming(x);
			translateY.value = withTiming(y, {}, () => {
				isGestureActive.value = false;
			});

			if (move) {
				chess.move(move);
				onTurn();
			}
		},
		[chess, translateX, translateY, onTurn, isGestureActive]
	);

	const onGestureEvent = useAnimatedGestureHandler({
		onStart: () => {
			offsetX.value = translateX.value;
			offsetY.value = translateY.value;
			isGestureActive.value = true;
		},
		onActive: ({ translationX, translationY }) => {
			translateX.value = offsetX.value + translationX;
			translateY.value = offsetY.value + translationY;
		},
		onEnd: () => {
			const from = toPosition({
				x: offsetX.value,
				y: offsetY.value,
			});
			const to = toPosition({
				x: translateX.value,
				y: translateY.value,
			});
			runOnJS(movePiece)(from, to);
			isGestureActive.value = false;
		},
	});

	const piece = useAnimatedStyle(() => ({
		position: "absolute",
		zIndex: isGestureActive.value ? 100 : 0,
		width: SIZE,
		height: SIZE,
		transform: [
			{
				translateX: translateX.value,
			},
			{ translateY: translateY.value },
		],
	}));

	const from = useAnimatedStyle(() => {
		const { x, y } = toTranslation(
			toPosition({ x: translateX.value, y: translateY.value })
		);
		return {
			opacity: isGestureActive.value ? 1 : 0,
			backgroundColor: "rgba(255,255,0,0.5)",
			position: "absolute",
			width: SIZE,
			height: SIZE,
			transform: [
				{
					translateX: x,
				},
				{ translateY: y },
			],
		};
	});

	const to = useAnimatedStyle(() => ({
		opacity: isGestureActive.value ? 1 : 0,
		backgroundColor: "rgba(255,255,0,0.5)",
		position: "absolute",
		width: SIZE,
		height: SIZE,
		transform: [
			{
				translateX: offsetX.value,
			},
			{ translateY: offsetY.value },
		],
	}));

	return (
		<>
			<Animated.View style={from} />
			<Animated.View style={to} />
			<PanGestureHandler onGestureEvent={onGestureEvent} enabled={enabled}>
				<Animated.View style={piece}>
					<Image
						source={PIECES[id] as ImageSourcePropType}
						style={{ width: SIZE, height: SIZE }}
					/>
				</Animated.View>
			</PanGestureHandler>
		</>
	);
}
