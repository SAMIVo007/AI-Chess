import {
	mainLoop,
	shutdownStockfish,
	sendCommand,
} from "react-native-stockfish-android";
import { NativeEventEmitter, NativeModules } from "react-native";

let eventListener: any = null;

export const startEngine = async (onOutput: (line: string) => void) => {
	await mainLoop();
	await sendCommand("uci\n");
	const eventEmitter = new NativeEventEmitter(
		NativeModules.StockfishAndroidModule
	);
	eventListener = eventEmitter.addListener("stockfish-output", onOutput);
};

export const stopEngine = async () => {
	await shutdownStockfish();
	if (eventListener) eventListener.remove();
};

export const analyzePosition = async (fen: string) => {
	await sendCommand(`position fen ${fen}\n`);
	await sendCommand("go depth 18\n");
};
