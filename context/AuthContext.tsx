import { Profile } from "@/constants/Types";
import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
	createContext,
	use,
	useCallback,
	useEffect,
	useState,
} from "react";

const HAS_SEEN_AUTH_KEY = "@has_seen_auth";

type AuthContextType = {
	session: Session | null;
	profile: Profile | null;
	loading: boolean;
	hasSeenAuth: boolean;
	setHasSeenAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
	session: null,
	profile: null,
	loading: true,
	hasSeenAuth: false,
	setHasSeenAuth: () => {},
});

export default function AuthContextProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [hasSeenAuth, setHasSeenAuthState] = useState(false);

	const setHasSeenAuth = useCallback(async () => {
		setHasSeenAuthState(true);
		try {
			await AsyncStorage.setItem(HAS_SEEN_AUTH_KEY, "true");
		} catch (e) {
			console.error("Error saving hasSeenAuth flag:", e);
		}
	}, []);

	const fetchProfile = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				console.error("Error fetching profile:", error);
			} else {
				setProfile(data);
			}
		} catch (e) {
			console.error("Exception fetching profile:", e);
		}
	};

	useEffect(() => {
		// 1️⃣ Restore session + hasSeenAuth flag on app start
		const SESSION_TIMEOUT_MS = 5000;

		const sessionPromise = supabase.auth.getSession().then(({ data }) => {
			return data.session;
		});

		const timeoutPromise = new Promise<null>((resolve) => {
			setTimeout(() => resolve(null), SESSION_TIMEOUT_MS);
		});

		const authFlagPromise = AsyncStorage.getItem(HAS_SEEN_AUTH_KEY)
			.then((val) => val === "true")
			.catch(() => false);

		Promise.all([Promise.race([sessionPromise, timeoutPromise]), authFlagPromise])
			.then(([session, seenAuth]) => {
				setSession(session);
				setHasSeenAuthState(seenAuth);
				if (session) {
					fetchProfile(session.user.id);
				}
				setLoading(false);
			})
			.catch((error) => {
				console.error("Error restoring session:", error);
				setSession(null);
				setLoading(false);
			});

		// 2️⃣ Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session) {
				fetchProfile(session.user.id);
			} else {
				setProfile(null);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const value = React.useMemo(
		() => ({ session, profile, loading, hasSeenAuth, setHasSeenAuth }),
		[session, profile, loading, hasSeenAuth, setHasSeenAuth],
	);

	return <AuthContext value={value}>{children}</AuthContext>;
}

export const useAuth = () => {
	const context = use(AuthContext);

	if (context === null) {
		throw new Error("useAuth must be used within an AuthContextProvider");
	}

	return context;
};
