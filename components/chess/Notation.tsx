import { Dimensions } from "react-native";
import { Vector } from "react-native-redash";

export type Position = `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8}`;

const { width } = Dimensions.get("window");
export const SIZE = width / 8;

export const toTranslation = (to: Position) => {
	"worklet";
	// worklet don't support destructuring yet
	const tokens = to.split("");
	const col = tokens[0];
	const row = tokens[1];
	if (!col || !row) {
		throw new Error("Invalid notation: " + to);
	}
	const indexes = {
		x: col.charCodeAt(0) - "a".charCodeAt(0),
		y: parseInt(row, 10) - 1,
	};
	return {
		x: indexes.x * SIZE,
		y: 7 * SIZE - indexes.y * SIZE,
	};
};

export const toPosition = ({ x, y }: Vector) => {
	"worklet";
	const col = String.fromCharCode(97 + Math.round(x / SIZE));
	const row = `${8 - Math.round(y / SIZE)}`;
	return `${col}${row}` as Position;
};
