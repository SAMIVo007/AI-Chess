import React, { useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Share,
	ActivityIndicator,
	ToastAndroid,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
	withDelay,
	SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface WaitingOverlayProps {
	inviteCode?: string;
	onCancel: () => void;
}

const BouncingDots = () => {
	const dot1 = useSharedValue(0);
	const dot2 = useSharedValue(0);
	const dot3 = useSharedValue(0);

	useEffect(() => {
		const bounce = (dot: SharedValue<number>, delay: number) => {
			dot.value = withDelay(
				delay,
				withRepeat(
					withSequence(
						withTiming(-5, { duration: 400 }),
						withTiming(0, { duration: 400 }),
						withTiming(0, { duration: 1000 }), // Pause for 1 second before next bounce
					),
					-1,
					true,
				),
			);
		};

		bounce(dot1, 0);
		bounce(dot2, 200);
		bounce(dot3, 400);
	}, []);

	const createDotStyle = (dot: SharedValue<number>) =>
		useAnimatedStyle(() => ({
			transform: [{ translateY: dot.value }],
		}));

	return (
		<View className="flex-row items-end h-3 ml-2 mb-1.5">
			<Animated.View
				className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1"
				style={createDotStyle(dot1)}
			/>
			<Animated.View
				className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1"
				style={createDotStyle(dot2)}
			/>
			<Animated.View
				className="w-1.5 h-1.5 rounded-full bg-indigo-400"
				style={createDotStyle(dot3)}
			/>
		</View>
	);
};

export const WaitingOverlay = ({
	inviteCode,
	onCancel,
}: WaitingOverlayProps) => {
	const router = useRouter();

	const handleShare = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (inviteCode) {
			await Share.share({
				message: `♟️ I challenge you to a chess game on Aura Chess!\n\nTap to join 👇\nhttps://aurachess.in/join/${inviteCode}\n\nOr enter code: ${inviteCode}`,
			});
		}
	};

	const handleCopy = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
		if (inviteCode) {
			await Clipboard.setStringAsync(inviteCode);
			ToastAndroid.show("Invite code copied to clipboard", ToastAndroid.SHORT);
		}
	};

	return (
		<BlurView
			intensity={40}
			tint="dark"
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				bottom: 0,
				right: 0,
				justifyContent: "center",
				alignItems: "center",
				zIndex: 20,
				padding: 24,
			}}
			experimentalBlurMethod="dimezisBlurView"
		>
			<View className="w-full max-w-sm bg-[#1e1e1e] border border-gray-700/50 rounded-3xl p-8 items-center shadow-2xl">
				<View className="mb-6 bg-indigo-500/20 p-4 rounded-full size-20 justify-center items-center">
					<FontAwesome5 name="user-clock" size={32} color="#818cf8" />
				</View>

				<View className="flex-row items-end justify-center mb-1">
					<Text className="text-white text-2xl font-bold font-sans">
						Waiting for Opponent
					</Text>
					<BouncingDots />
				</View>

				<Text className="text-gray-400 text-center mb-8">
					Share this code with your friend to start the game.
				</Text>

				{inviteCode ? (
					<View className="w-full mb-8">
						<Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 text-center">
							Invite Code
						</Text>
						<TouchableOpacity
							onPress={handleCopy}
							className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 flex-row items-center justify-between"
						>
							<Text className="text-white text-2xl font-mono font-bold tracking-widest text-center flex-1">
								{inviteCode}
							</Text>
							<MaterialIcons name="content-copy" size={20} color="#9ca3af" />
						</TouchableOpacity>
					</View>
				) : (
					<ActivityIndicator size="large" color="#4f46e5" className="mb-8" />
				)}

				<View className="w-full gap-3">
					<TouchableOpacity
						onPress={handleShare}
						className="w-full bg-indigo-600 py-4 rounded-xl flex-row items-center justify-center"
					>
						<Ionicons name="share-outline" size={20} color="white" />
						<Text className="text-white font-bold text-lg ml-2">Share Invite</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={onCancel}
						className="w-full bg-gray-800 py-4 rounded-xl flex-row items-center justify-center"
					>
						<Text className="text-gray-300 font-semibold text-lg">Cancel</Text>
					</TouchableOpacity>
				</View>
			</View>
		</BlurView>
	);
};
