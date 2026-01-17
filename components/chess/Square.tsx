import { View, Dimensions, Text } from "react-native";
import React from "react";
import { SquareProps } from "@/constants/Types";

const { width } = Dimensions.get("window");
export const SQUARE_SIZE = width / 8;

const columns = ["a", "b", "c", "d", "e", "f", "g", "h"];
const rows = ["8", "7", "6", "5", "4", "3", "2", "1"];

export default function Square({
	index,
	color,
	row,
	col,
	orientation,
}: SquareProps) {
	return (
		<View
			style={{
				flexDirection: "row",
				width: SQUARE_SIZE,
				height: SQUARE_SIZE,
				justifyContent: "space-between",
				alignItems: "flex-start",
				paddingLeft: 2,
				paddingRight: 2,
				backgroundColor: color === "light" ? "#cdffd2ff" : "#006a0bff",
			}}
		>
			<View
				style={{
					flex: 1,
					justifyContent: "flex-start",
					alignItems: "flex-start",
					height: "100%",
				}}
			>
				<Text
					style={{
						color: color === "light" ? "#006a0bff" : "#cdffd2ff",
						fontSize: 10,
					}}
				>
					{index % 8 === 0 ? (orientation === "w" ? rows[row] : rows[7 - row]) : ""}
				</Text>
			</View>

			<View
				style={{
					flex: 1,
					justifyContent: "flex-end",
					alignItems: "flex-end",
					height: "100%",
				}}
			>
				<Text
					style={{
						color: color === "light" ? "#006a0bff" : "#cdffd2ff",
						fontSize: 10,
					}}
				>
					{Math.floor(index / 8) === 7
						? orientation === "w"
							? columns[col]
							: columns[7 - col]
						: ""}
				</Text>
			</View>
		</View>
	);
}