import { View, Dimensions, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SquareProps } from "@/constants/Types";

const { width } = Dimensions.get("window");
export const SQUARE_SIZE = width / 8;

const columns = ["a", "b", "c", "d", "e", "f", "g", "h"];
const rows = ["8", "7", "6", "5", "4", "3", "2", "1"];

export default React.memo(function Square({
	index,
	color,
	row,
	col,
	isSelected,
	isHighlighted,
	isCapture,
	onPress,
}: SquareProps) {
	return (
		<TouchableOpacity
			activeOpacity={1}
			onPress={() => onPress?.(row, col)}
			style={{
				flexDirection: "row",
				width: SQUARE_SIZE,
				height: SQUARE_SIZE,
				justifyContent: "space-between",
				alignItems: "flex-start",
				paddingLeft: 2,
				paddingRight: 2,
				backgroundColor: isSelected
					? "#bbcC44" // Highlight color
					: color === "light"
					? "#d4ffd8ff"
					: "#1c7e26ff",
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
						color: color === "light" ? "#1c7e26ff" : "#d4ffd8ff",
						fontSize: 10,
					}}
				>
					{index % 8 === 0 ? rows[row] : ""}
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
						color: color === "light" ? "#1c7e26ff" : "#d4ffd8ff",
						fontSize: 10,
					}}
				>
					{Math.floor(index / 8) === 7 ? columns[col] : ""}
				</Text>
			</View>

			{isHighlighted && (
				<View
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					{isCapture ? (
						<View
							style={{
								width: SQUARE_SIZE,
								height: SQUARE_SIZE,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<View
								style={{
									width: SQUARE_SIZE * 1,
									height: SQUARE_SIZE * 1,
									borderRadius: SQUARE_SIZE * 0.5,
									borderWidth: SQUARE_SIZE * 0.1,
									borderColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent circle
								}}
							/>
						</View>
					) : (
						<View
							style={{
								width: SQUARE_SIZE * 0.4,
								height: SQUARE_SIZE * 0.4,
								borderRadius: SQUARE_SIZE * 0.2,
								backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent dot
							}}
						/>
					)}
				</View>
			)}
		</TouchableOpacity>
	);
});
