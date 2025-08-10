import { NativeEventEmitter, NativeModules } from "react-native";
import {
	mainLoop,
	shutdownStockfish,
	sendCommand,
} from "react-native-stockfish-android";

const emitter = new NativeEventEmitter(
	NativeModules.ReactNativeStockfishChessEngine
);

let inited = false;
let engineRunning = false;

export async function startEngine(onLine: (line: string) => void) {
	console.log("Stockfish starting...");

	// Clear any existing listeners first (prevent duplicates)
	emitter.removeAllListeners("stockfish-output");

	// listen for engine output
	emitter.addListener("stockfish-output", onLine);

	try {
		// Only start the engine process if it's not already running
		if (!engineRunning) {
			await mainLoop();
			engineRunning = true;
		}

		// only do handshake once per process
		if (!inited) {
			await sendCommand("uci\n");
			await sendCommand("isready\n");
			inited = true;
		}

		// Always send ucinewgame for a fresh game state
		await sendCommand("ucinewgame\n");
		console.log("Stockfish started");
	} catch (error) {
		console.error("Stockfish failed to start:", error);
	}
}

export async function stopEngine() {
	console.log("Stockfish stopping...");
	emitter.removeAllListeners("stockfish-output");
	// Don't shutdown the engine process, just remove listeners
	// await shutdownStockfish();
	// engineRunning = false;
	// inited = false;
	console.log("Stockfish listeners removed");
}

// New function for complete shutdown (call only on app exit)
export async function shutdownEngineCompletely() {
	console.log("Stockfish shutting down completely...");
	emitter.removeAllListeners("stockfish-output");
	await shutdownStockfish();
	engineRunning = false;
	inited = false;
	console.log("Stockfish stopped completely");
}

export async function analyzePosition(
	fen: string,
	level: number = 1 // range: 0 (easy) → 20 (hard)
) {
	console.log(`Analyzing position: ${fen}, level: ${level}`);

	try {
		const skill = Math.max(0, Math.min(20, level)); // clamp between 0 and 20
		await sendCommand(`setoption name Skill Level value ${skill}\n`);

		await sendCommand(`position fen ${fen}\n`);

		// Smart thinking time: from 200ms to 3000ms
		const movetime = 200 + skill * 140;

		// Smart depth cap: from 2 to 18
		const depth = 2 + Math.floor(skill * 0.7);

		// If skill is low, use movetime to allow blunders (fun for players)
		if (skill <= 5) {
			await sendCommand(`go movetime ${movetime}\n`);
		}
		// If skill is medium to high, cap with depth (avoids mobile lag)
		else {
			await sendCommand(`go depth ${depth}\n`);
		}
	} catch (error) {
		console.error("Error analyzing position:", error);
		throw error;
	}
}
