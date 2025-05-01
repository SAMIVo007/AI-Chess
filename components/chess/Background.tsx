import React from "react";
import { Text, View } from "react-native";

const BLACK = "#648544";
const WHITE = "#e6e9c6";

interface RowProps {
	row: number;
}

interface SquareProps extends RowProps {
	col: number;
}

const Square = ({ row, col }: SquareProps) => {
	const isWhite = (row + col) % 2 === 0;
	const bgColor = isWhite ? WHITE : BLACK;
	const textColor = isWhite ? BLACK : WHITE;

	return (
		<View
			className="flex flex-1 p-1 py-0.5 justify-between"
			style={{ backgroundColor: bgColor }}
		>
			<Text
				className="text-xs"
				style={{ color: textColor, opacity: col === 0 ? 1 : 0 }}
			>
				{8 - row}
			</Text>
			<Text
				className="text-xs text-right"
				style={{ color: textColor, opacity: row === 7 ? 1 : 0 }}
			>
				{String.fromCharCode(97 + col)}
			</Text>
		</View>
	);
};

const Row = ({ row }: RowProps) => {
	return (
		<View className="flex flex-1 flex-row">
			{new Array(8).fill(0).map((_, col) => (
				<Square key={col} row={row} col={col} />
			))}
		</View>
	);
};

export default function Background() {
	return (
		<View className="flex flex-1">
			{new Array(8).fill(0).map((_, row) => (
				<Row key={row} row={row} />
			))}
		</View>
	);
}
