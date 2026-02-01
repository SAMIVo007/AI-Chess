import React, { useMemo, useState } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
	Alert,
	Share,
} from "react-native";
import BottomSheet, {
	BottomSheetView,
	BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { createGameWithInvite } from "@/api/supabaseAPI";
import { useThemeColor } from "@/hooks/useThemeColor";

interface CreateGameModalProps {
	bottomSheetRef: any;
	handleSheetChanges: (index: number) => void;
	onClose: () => void;
}

type ColorPreference = "white" | "black" | "random";

export const CreateGameModal = ({
	bottomSheetRef,
	handleSheetChanges,
	onClose,
}: CreateGameModalProps) => {
	const router = useRouter();
	const { session } = useAuth();
	const [loading, setLoading] = useState(false);
	const [selectedColor, setSelectedColor] = useState<ColorPreference>("random");

	const snapPoints = useMemo(() => ["50%"], []);

	const backgroundColor = useThemeColor({}, "background");
	const textColor = useThemeColor({}, "text");

	const handleCreateGame = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		if (!session?.user) {
			Alert.alert("Error", "You must be logged in to create a game.");
			return;
		}

		setLoading(true);
		try {
			const result = await createGameWithInvite(session.user.id, {
				colorPreference: selectedColor,
			});

			if (result) {
				const deepLink = `aichess://join/${result.inviteCode}`;
				// const webLink = `https://aichess.app/join/${result.inviteCode}`;

				// 1. Close Modal
				onClose();

				// // 2. Share
				// const shareResult = await Share.share({
				// 	message: `🏁 Join my chess game! I'm playing as ${result.playerColor}.\n\n🔗 Link: ${deepLink}\n\n📱 Code: ${result.inviteCode}`,
				// 	title: "Chess Game Invite",
				// 	url: deepLink,
				// });

				// 3. Navigate to Game (regardless of share result, so user can wait)
				// We wait a bit if share is dismissed to ensure smooth transition
				setTimeout(() => {
					router.push({
						pathname: "/online-game",
						params: { gameId: result.gameId, inviteCode: result.inviteCode },
					});
				}, 100);
			}
		} catch (error) {
			console.error("Error creating game:", error);
			Alert.alert("Error", "Failed to create game.");
		} finally {
			setLoading(false);
		}
	};

	const renderBackdrop = (props: any) => (
		<BottomSheetBackdrop
			{...props}
			disappearsOnIndex={-1}
			appearsOnIndex={0}
			opacity={0.5}
		/>
	);

	const ColorOption = ({
		color,
		label,
		icon,
	}: {
		color: ColorPreference;
		label: string;
		icon: string;
	}) => {
		const isSelected = selectedColor === color;
		const activeBorder = useThemeColor(
			{ light: "#007AFF", dark: "#0A84FF" },
			"tint"
		);

		return (
			<TouchableOpacity
				onPress={() => setSelectedColor(color)}
				style={[
					styles.colorOption,
					isSelected && {
						borderColor: activeBorder,
						borderWidth: 2,
						backgroundColor: "rgba(0,122,255,0.1)",
					},
				]}
			>
				<FontAwesome5
					name={icon}
					size={24}
					color={
						isSelected
							? activeBorder
							: color === "white"
							? "#999"
							: color === "black"
							? "#333"
							: "#666"
					}
					solid={color === "black"}
				/>
				<ThemedText
					style={[
						styles.colorLabel,
						isSelected && { color: activeBorder, fontWeight: "bold" },
					]}
				>
					{label}
				</ThemedText>
			</TouchableOpacity>
		);
	};

	return (
		<BottomSheet
			ref={bottomSheetRef}
			onClose={onClose}
			onChange={handleSheetChanges}
			snapPoints={snapPoints}
			enablePanDownToClose
			enableBlurKeyboardOnGesture
			keyboardBlurBehavior="restore"
			backdropComponent={renderBackdrop}
			backgroundStyle={{ backgroundColor: backgroundColor }}
			handleIndicatorStyle={{ backgroundColor: "#9BA1A6" }}
			// index={-1}
		>
			<BottomSheetView style={styles.contentContainer}>
				<View style={styles.header}>
					<ThemedText type="subtitle">Create New Game</ThemedText>
					<ThemedText style={styles.subtext}>
						Choose your side and invite a friend.
					</ThemedText>
				</View>

				<ThemedText style={styles.sectionTitle}>I want to play as:</ThemedText>

				<View style={styles.optionsContainer}>
					<ColorOption color="white" label="White" icon="chess-pawn" />
					<ColorOption color="random" label="Random" icon="random" />
					<ColorOption color="black" label="Black" icon="chess-pawn" />
				</View>

				<TouchableOpacity
					style={[styles.createButton, { opacity: loading ? 0.7 : 1 }]}
					onPress={handleCreateGame}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<ThemedText style={styles.createButtonText}>Create & Invite</ThemedText>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.cancelButton}
					onPress={() => bottomSheetRef.current?.close()}
					disabled={loading}
				>
					<ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
				</TouchableOpacity>
			</BottomSheetView>
		</BottomSheet>
	);
};

const styles = StyleSheet.create({
	contentContainer: {
		flex: 1,
		padding: 24,
	},
	header: {
		marginBottom: 24,
		alignItems: "center",
	},
	subtext: {
		fontSize: 14,
		color: "#666",
		marginTop: 8,
		textAlign: "center",
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 12,
		textAlign: "center",
	},
	optionsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 32,
	},
	colorOption: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		marginHorizontal: 4,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	colorLabel: {
		marginTop: 8,
		fontSize: 14,
	},
	createButton: {
		backgroundColor: "#0062ffff",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#007bffff",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	createButtonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "bold",
	},
	cancelButton: {
		marginTop: 12,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButtonText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#FF453A",
	},
});
