import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SquareProps } from "@/constants/Types";

const columns = ["a", "b", "c", "d", "e", "f", "g", "h"];
const rows = ["8", "7", "6", "5", "4", "3", "2", "1"];

export default React.memo(function Square({
	index,
	color,
	row,
	col,
	squareSize,
	isSelected,
	isHighlighted,
	isCapture,
	isLastMove,
	onPress,
}: SquareProps) {
	const getBackgroundColor = () => {
		if (isSelected) return "#bbcC44";
		if (isLastMove) return color === "light" ? "#f5f682" : "#b9ca43";
		return color === "light" ? "#d4ffd8ff" : "#1c7e26ff";
	};

	return (
		<TouchableOpacity
			activeOpacity={1}
			onPress={() => onPress?.(row, col)}
			style={{
				flexDirection: "row",
				width: squareSize,
				height: squareSize,
				justifyContent: "space-between",
				alignItems: "flex-start",
				paddingLeft: 2,
				paddingRight: 2,
				backgroundColor: getBackgroundColor(),
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
								width: squareSize,
								height: squareSize,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<View
								style={{
									width: squareSize * 1,
									height: squareSize * 1,
									borderRadius: squareSize * 0.5,
									borderWidth: squareSize * 0.1,
									borderColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent circle
								}}
							/>
						</View>
					) : (
						<View
							style={{
								width: squareSize * 0.4,
								height: squareSize * 0.4,
								borderRadius: squareSize * 0.2,
								backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent dot
							}}
						/>
					)}
				</View>
			)}
		</TouchableOpacity>
	);
});
