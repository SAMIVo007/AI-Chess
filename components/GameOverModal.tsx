import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSpring,
	withSequence,
	withDelay,
	runOnJS,
	FadeIn,
	FadeOut,
	Keyframe,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { router } from "expo-router";

interface GameOverModalProps {
	isOpen: boolean;
	isWinner: boolean;
	onRematch: () => void;
	onNewGame: () => void;
	onClose: () => void;
}

const { width } = Dimensions.get("window");

export default function GameOverModal({
	isOpen,
	isWinner,
	onRematch,
	onNewGame,
	onClose,
}: GameOverModalProps) {
	const [showMenu, setShowMenu] = useState(false);

	// Shared values for animations
	const containerScale = useSharedValue(0.9);
	const containerOpacity = useSharedValue(0);
	const iconRotation = useSharedValue(0);
	const iconScale = useSharedValue(1);

	useEffect(() => {
		if (isOpen) {
			// Reset states
			setShowMenu(false);
			containerScale.value = 0.9;
			containerOpacity.value = 0;

			// Start enter animation
			containerOpacity.value = withTiming(1, { duration: 300 });
			containerScale.value = withSpring(1);

			// Icon animation loop
			const rotateAmount = isWinner ? 10 : 0;
			iconRotation.value = withSequence(
				withTiming(rotateAmount, { duration: 500 }),
				withTiming(-rotateAmount, { duration: 500 }),
				withTiming(0, { duration: 500 })
			);
			iconScale.value = withSequence(
				withTiming(1.2, { duration: 500 }),
				withTiming(1, { duration: 500 })
			);

			// Show menu after delay
			const timer = setTimeout(() => {
				setShowMenu(true);
			}, 2500);

			return () => clearTimeout(timer);
		} else {
			setShowMenu(false);
			containerOpacity.value = withTiming(0, { duration: 200 });
			containerScale.value = withTiming(0.9, { duration: 200 });
		}
	}, [isOpen, isWinner]);

	// Continuous animation helper could be added if needed,
	// but useEffect based sequence covers the intro.

	// Styles
	const containerStyle = useAnimatedStyle(() => ({
		opacity: containerOpacity.value,
		transform: [{ scale: containerScale.value }],
	}));

	const iconStyle = useAnimatedStyle(() => ({
		transform: [
			{ rotate: `${iconRotation.value}deg` },
			{ scale: iconScale.value },
		],
	}));

	if (!isOpen) return null;

	return (
		<Modal transparent visible={isOpen} animationType="none">
			<View style={styles.overlay}>
				<Animated.View style={[styles.container, containerStyle]}>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<MaterialIcons name="close" size={24} color="#a1a1aa" />
					</TouchableOpacity>
					{!showMenu ? (
						<Animated.View
							key="status"
							entering={FadeIn.duration(300).delay(100)}
							exiting={FadeOut.duration(300)}
							style={styles.contentContainer}
						>
							<Animated.Text style={[styles.icon, iconStyle]}>
								{isWinner ? "🏆" : "💀"}
							</Animated.Text>
							<Text
								style={[styles.title, { color: isWinner ? "#fbbf24" : "#ef4444" }]}
							>
								{isWinner ? "VICTORY!" : "GAME OVER"}
							</Text>
							<Text style={styles.subtitle}>
								{isWinner
									? "You conquered the challenge!"
									: "Better luck next time, champ."}
							</Text>
						</Animated.View>
					) : (
						<Animated.View
							key="menu"
							entering={FadeIn.duration(300).delay(100)}
							style={styles.menuContainer}
						>
							<View style={styles.menuHeader}>
								<Text style={styles.menuTitle}>Play Again?</Text>
								<View style={styles.divider} />
							</View>

							<TouchableOpacity
								onPress={onRematch}
								style={[styles.button, styles.rematchButton]}
								activeOpacity={0.8}
							>
								<Text style={styles.rematchButtonText}>REMATCH</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={onNewGame}
								style={[styles.button, styles.newGameButton]}
								activeOpacity={0.8}
							>
								<Text style={styles.newGameButtonText}>NEW GAME</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => router.replace("/")}
								style={styles.textButton}
							>
								<Text style={styles.textButtonText}>Exit to Home</Text>
							</TouchableOpacity>
						</Animated.View>
					)}
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.8)",
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	container: {
		width: "100%",
		maxWidth: 380,
		backgroundColor: "#18181b", // zinc-900
		borderRadius: 24,
		borderWidth: 1,
		borderColor: "#27272a", // zinc-800
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.5,
		shadowRadius: 20,
		elevation: 10,
		overflow: "hidden",
	},
	contentContainer: {
		alignItems: "center",
		paddingVertical: 48,
		paddingHorizontal: 24,
	},
	icon: {
		fontSize: 80,
		marginBottom: 24,
	},
	title: {
		fontSize: 36,
		fontWeight: "900",
		fontStyle: "italic",
		letterSpacing: -1,
		textAlign: "center",
	},
	subtitle: {
		marginTop: 8,
		color: "#a1a1aa", // zinc-400
		fontWeight: "500",
		textAlign: "center",
	},
	menuContainer: {
		padding: 32,
		gap: 12,
		alignItems: "stretch",
	},
	menuHeader: {
		alignItems: "center",
		marginBottom: 16,
	},
	menuTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "white",
	},
	divider: {
		height: 4,
		width: 48,
		backgroundColor: "#6366f1", // indigo-500
		marginTop: 8,
		borderRadius: 2,
	},
	button: {
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	rematchButton: {
		backgroundColor: "#4f46e5", // indigo-600
	},
	rematchButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	newGameButton: {
		backgroundColor: "#27272a", // zinc-800
	},
	newGameButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	textButton: {
		marginTop: 8,
		paddingVertical: 12,
		alignItems: "center",
	},
	textButtonText: {
		color: "#71717a", // zinc-500
		fontWeight: "600",
		fontSize: 15,
	},
	closeButton: {
		position: "absolute",
		top: 16,
		right: 16,
		zIndex: 10,
		padding: 4,
	},
});
