import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { PieceSelectorProps } from "@/constants/Types";
import { SQUARE_SIZE } from "./Square";
import { Image } from "expo-image";
import { PieceImageMap } from "./Piece";
import { PromotionPieceType } from "@/constants/Types";

const types: PromotionPieceType[] = ["q", "b", "r", "n"];

export default function PieceSelector({ color, onPress }: PieceSelectorProps) {
	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				backgroundColor: "rgba(68, 97, 68, 0.81)",
				borderRadius: 10,
			}}
		>
			{types.map((type, index) => (
				<TouchableOpacity
					key={`${color}-${type}-${index}`}
					activeOpacity={0.4}
					onPress={() => onPress?.(type)}
					style={{
						width: SQUARE_SIZE * 1.05,
						height: SQUARE_SIZE * 1.05,
						justifyContent: "center",
						alignItems: "center",
						zIndex: 10,
						marginHorizontal: 1,
					}}
				>
					<Image
						style={{ flex: 1, width: "100%" }}
						source={PieceImageMap[color][type]}
						contentFit="cover"
					/>
				</TouchableOpacity>
			))}
		</View>
	);
}
