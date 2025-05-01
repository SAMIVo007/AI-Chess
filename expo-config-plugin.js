// This is a custom Expo config plugin that modifies the Android build.gradle file 
module.exports = (config) => {
	return {
		...config,
		mods: {
			android: {
				appendContents: (buildGradle) => {
					return {
						path: "build.gradle",
						contents:
							buildGradle +
							"\nandroid.packagingOptions.pickFirst 'lib/**/libc++_shared.so'",
					};
				},
			},
		},
	};
};
