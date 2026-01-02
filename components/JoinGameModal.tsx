import React, { useMemo, useState } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
	Alert,
	Keyboard,
} from "react-native";
import BottomSheet, {
	BottomSheetTextInput,
	BottomSheetView,
	BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { joinGameByInvite } from "@/api/supabaseAPI";
import { useThemeColor } from "@/hooks/useThemeColor";

interface JoinGameModalProps {
	bottomSheetRef: any;
	handleSheetChanges: (index: number) => void;
}

export const JoinGameModal = ({
	bottomSheetRef,
	handleSheetChanges,
}: JoinGameModalProps) => {
	const router = useRouter();
	const { session } = useAuth();
	const [joinCode, setJoinCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const snapPoints = useMemo(() => ["30%"], []);

	const backgroundColor = useThemeColor({}, "background");
	const iconColor = useThemeColor({}, "icon");
	const textColor = useThemeColor({}, "text");
	const inputBackground = useThemeColor(
		{ light: "#f0f0f0", dark: "#2C2C2E" },
		"background"
	);

	const handleJoinGame = async () => {
		if (!joinCode.trim()) {
			setError("Please enter a valid invite code.");
			return;
		}

		Keyboard.dismiss();
		setLoading(true);
		setError("");

		if (!session?.user?.id) {
			setError("You must be logged in to join a game.");
			setLoading(false);
			return;
		}

		try {
			const gameId = await joinGameByInvite(joinCode.trim(), session.user.id);
			if (gameId) {
				bottomSheetRef.current?.close();
				// Move Guest to Game Screen
				router.push({
					pathname: "/game",
					params: { gameId: gameId },
				});
				setJoinCode("");
				setError("");
			} else {
				setError("Invalid or expired code.");
			}
		} catch (error) {
			setError("Could not join game.");
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

	return (
		<BottomSheet
			ref={bottomSheetRef}
			onChange={handleSheetChanges}
			snapPoints={snapPoints}
			enablePanDownToClose
			enableBlurKeyboardOnGesture
			keyboardBlurBehavior="restore"
			backdropComponent={renderBackdrop}
			backgroundStyle={{ backgroundColor: backgroundColor }}
			handleIndicatorStyle={{ backgroundColor: "#9BA1A6" }}
			index={-1}
		>
			<BottomSheetView style={styles.contentContainer}>
				<View style={styles.header}>
					<ThemedText type="subtitle">Enter Game Code</ThemedText>
					<ThemedText style={styles.subtext}>
						Enter the code shared by your friend to join the game.
					</ThemedText>
				</View>

				<View
					style={[
						styles.inputContainer,
						{
							backgroundColor: inputBackground,
							borderColor: error ? "red" : "transparent",
							borderWidth: error ? 1 : 0,
						},
					]}
				>
					<Feather
						name="hash"
						size={20}
						color={error ? "red" : iconColor}
						style={styles.inputIcon}
					/>
					<BottomSheetTextInput
						placeholder="e.g. 123456"
						placeholderTextColor="#999"
						style={[styles.input, { color: textColor }]}
						autoCapitalize="none"
						value={joinCode}
						onChangeText={(text) => {
							setJoinCode(text);
							if (error) setError("");
						}}
						returnKeyType="join"
						onSubmitEditing={handleJoinGame}
					/>
				</View>
				{error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

				<TouchableOpacity
					style={[styles.joinButton, { opacity: loading ? 0.7 : 1 }]}
					onPress={handleJoinGame}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<ThemedText style={styles.joinButtonText}>Connect</ThemedText>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.cancelButton}
					onPress={() => {
						setJoinCode("");
						setError("");
						bottomSheetRef.current?.close();
					}}
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
		marginBottom: 32,
		alignItems: "center",
	},
	subtext: {
		fontSize: 14,
		color: "#666",
		marginTop: 8,
		textAlign: "center",
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 24,
	},
	inputIcon: {
		marginRight: 12,
	},
	input: {
		flex: 1,
		fontSize: 18,
		fontWeight: "600",
		padding: 0,
	},
	joinButton: {
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
	joinButtonText: {
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
		color: "#FF453A", // System red for destructive/cancel actions
	},
	errorText: {
		color: "#FF453A",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 16,
		marginTop: -16,
	},
});
