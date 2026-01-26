import React from "react";
import { View, Text } from "react-native";
import { PressableScale } from "pressto";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ActionCardProps {
	title: string;
	subtitle: string;
	icon: any;
	color: string;
	onPress: () => void;
}

export const ActionCard = ({
	title,
	subtitle,
	icon,
	color,
	onPress,
}: ActionCardProps) => (
	<PressableScale
		onPress={onPress}
		style={{
			backgroundColor: color,
			height: 140,
			marginBottom: 16,
			borderRadius: 24,
			shadowColor: "#000",
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 0.25,
			shadowRadius: 3.84,
			elevation: 5,
		}}
	>
		<View style={{ borderRadius: 24, overflow: "hidden" }}>
			<View className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
				<MaterialCommunityIcons name={icon} size={120} color="white" />
			</View>
			<View className="p-6 h-full justify-between">
				<View className="bg-white/20 self-start p-3 rounded-2xl">
					<MaterialCommunityIcons name={icon} size={24} color="white" />
				</View>
				<View>
					<Text className="text-white text-2xl font-bold font-sans">{title}</Text>
					<Text className="text-white/80 font-medium">{subtitle}</Text>
				</View>
			</View>
		</View>
	</PressableScale>
);
