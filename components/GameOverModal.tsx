import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSpring,
	withSequence,
	withDelay,
	FadeIn,
} from "react-native-reanimated";
import { router } from "expo-router";

export type GameEndReason =
	| "checkmate"
	| "stalemate"
	| "timeout"
	| "resignation"
	| "draw"
	| "insufficient_material"
	| "threefold_repetition"
	| "fifty_move_rule";

export type GameResult = "win" | "loss" | "draw";

interface GameOverModalProps {
	isOpen: boolean;
	result: GameResult; // 'win' | 'loss' | 'draw'
	reason: GameEndReason;
	playerColor: "w" | "b";
	onRematch: () => void;
	onNewGame: () => void;
	onClose: () => void;
}

const getReasonText = (reason: GameEndReason, result: GameResult): string => {
	switch (reason) {
		case "checkmate":
			return result === "win" ? "by Checkmate" : "by Checkmate";
		case "stalemate":
			return "by Stalemate";
		case "timeout":
			return result === "win" ? "on Time" : "on Time";
		case "resignation":
			return result === "win" ? "by Resignation" : "by Resignation";
		case "draw":
			return "by Agreement";
		case "insufficient_material":
			return "Insufficient Material";
		case "threefold_repetition":
			return "Threefold Repetition";
		case "fifty_move_rule":
			return "50-Move Rule";
		default:
			return "";
	}
};

const getResultConfig = (result: GameResult) => {
	switch (result) {
		case "win":
			return {
				title: "Victory",
				subtitle: "Congratulations!",
				color: "#22c55e", // green-500
				bgColor: "rgba(34, 197, 94, 0.1)",
				icon: "crown" as const,
			};
		case "loss":
			return {
				title: "Defeat",
				subtitle: "Better luck next time",
				color: "#ef4444", // red-500
				bgColor: "rgba(239, 68, 68, 0.1)",
				icon: "chess-king" as const,
			};
		case "draw":
			return {
				title: "Draw",
				subtitle: "A close match!",
				color: "#f59e0b", // amber-500
				bgColor: "rgba(245, 158, 11, 0.1)",
				icon: "handshake" as const,
			};
	}
};

export default function GameOverModal({
	isOpen,
	result,
	reason,
	playerColor,
	onRematch,
	onNewGame,
	onClose,
}: GameOverModalProps) {
	// Animation values
	const containerScale = useSharedValue(0.9);
	const containerOpacity = useSharedValue(0);
	const iconScale = useSharedValue(0.5);
	const iconRotation = useSharedValue(-10);

	useEffect(() => {
		if (isOpen) {
			// Reset and animate in
			containerScale.value = 0.9;
			containerOpacity.value = 0;
			iconScale.value = 0.5;
			iconRotation.value = -10;

			containerOpacity.value = withTiming(1, { duration: 300 });
			containerScale.value = withSpring(1, { damping: 15 });

			// Icon entrance animation
			iconScale.value = withDelay(200, withSpring(1, { damping: 10 }));
			iconRotation.value = withDelay(
				200,
				withSequence(
					withTiming(10, { duration: 150 }),
					withTiming(-5, { duration: 100 }),
					withTiming(0, { duration: 100 })
				)
			);
		} else {
			containerOpacity.value = withTiming(0, { duration: 200 });
			containerScale.value = withTiming(0.9, { duration: 200 });
		}
	}, [isOpen]);

	const containerStyle = useAnimatedStyle(() => ({
		opacity: containerOpacity.value,
		transform: [{ scale: containerScale.value }],
	}));

	const iconStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: iconScale.value },
			{ rotate: `${iconRotation.value}deg` },
		],
	}));

	if (!isOpen) return null;

	const config = getResultConfig(result);
	const reasonText = getReasonText(reason, result);

	return (
		<Modal transparent visible={isOpen} animationType="none">
			<View style={styles.overlay}>
				<Animated.View style={[styles.container, containerStyle]}>
					{/* Close Button */}
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<MaterialCommunityIcons name="close" size={24} color="#71717a" />
					</TouchableOpacity>

					{/* Result Section */}
					<View style={styles.resultSection}>
						{/* Icon */}
						<Animated.View
							style={[
								styles.iconContainer,
								{ backgroundColor: config.bgColor },
								iconStyle,
							]}
						>
							<FontAwesome5 name={config.icon} size={48} color={config.color} />
						</Animated.View>

						{/* Title */}
						<Animated.Text
							entering={FadeIn.delay(300).duration(300)}
							style={[styles.title, { color: config.color }]}
						>
							{config.title}
						</Animated.Text>

						{/* Reason */}
						<Animated.Text
							entering={FadeIn.delay(400).duration(300)}
							style={styles.reason}
						>
							{reasonText}
						</Animated.Text>

						{/* Player Info */}
						<Animated.View
							entering={FadeIn.delay(500).duration(300)}
							style={styles.playerInfo}
						>
							<View style={styles.playerBadge}>
								<FontAwesome5
									name="chess-pawn"
									size={14}
									color={playerColor === "w" ? "#18181b" : "#fafafa"}
								/>
								<Text style={styles.playerText}>
									You played as {playerColor === "w" ? "White" : "Black"}
								</Text>
							</View>
						</Animated.View>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* Actions */}
					<Animated.View
						entering={FadeIn.delay(600).duration(300)}
						style={styles.actionsContainer}
					>
						<TouchableOpacity
							style={styles.primaryButton}
							onPress={onRematch}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons name="replay" size={20} color="white" />
							<Text style={styles.primaryButtonText}>Rematch</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.secondaryButton}
							onPress={onNewGame}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons name="chess-knight" size={20} color="#a1a1aa" />
							<Text style={styles.secondaryButtonText}>New Game</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.textButton}
							onPress={() => router.replace("/")}
						>
							<Text style={styles.textButtonText}>Exit to Home</Text>
						</TouchableOpacity>
					</Animated.View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.85)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	container: {
		width: "100%",
		maxWidth: 360,
		backgroundColor: "#18181b",
		borderRadius: 28,
		borderWidth: 1,
		borderColor: "#27272a",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 20 },
		shadowOpacity: 0.5,
		shadowRadius: 30,
		elevation: 15,
		overflow: "hidden",
	},
	closeButton: {
		position: "absolute",
		top: 16,
		right: 16,
		zIndex: 10,
		padding: 4,
	},
	resultSection: {
		alignItems: "center",
		paddingTop: 48,
		paddingBottom: 32,
		paddingHorizontal: 24,
	},
	iconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	title: {
		fontSize: 36,
		fontWeight: "800",
		letterSpacing: -0.5,
		textAlign: "center",
	},
	reason: {
		fontSize: 16,
		color: "#a1a1aa",
		marginTop: 6,
		textAlign: "center",
	},
	playerInfo: {
		marginTop: 20,
	},
	playerBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#27272a",
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		gap: 8,
	},
	playerText: {
		color: "#a1a1aa",
		fontSize: 13,
		fontWeight: "500",
	},
	divider: {
		height: 1,
		backgroundColor: "#27272a",
		marginHorizontal: 24,
	},
	actionsContainer: {
		padding: 24,
		gap: 12,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#4f46e5",
		paddingVertical: 16,
		borderRadius: 14,
		gap: 8,
	},
	primaryButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	secondaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#27272a",
		paddingVertical: 16,
		borderRadius: 14,
		gap: 8,
	},
	secondaryButtonText: {
		color: "#fafafa",
		fontSize: 16,
		fontWeight: "600",
	},
	textButton: {
		paddingVertical: 12,
		alignItems: "center",
	},
	textButtonText: {
		color: "#71717a",
		fontSize: 15,
		fontWeight: "600",
	},
});
