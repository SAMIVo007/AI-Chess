import { router } from "expo-router";

export const handleGoBack = () => {
	if (router.canGoBack()) {
		router.back();
	} else {
		router.replace("/");
	}
};
