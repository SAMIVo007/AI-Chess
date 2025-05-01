import * as Speech from "expo-speech";

export const speakMove = (text: string) => {
	Speech.speak(text, {
		language: "pa-IN", // or 'pa-IN' if you want to try Punjabi voices
		rate: 1.0,
		pitch: 1.0,
	});
};
