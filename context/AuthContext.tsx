import { Profile } from "@/constants/Types";
import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import React, { createContext, use, useEffect, useState } from "react";

type AuthContextType = {
	session: Session | null;
	profile: Profile | null;
	loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
	session: null,
	profile: null,
	loading: true,
});

export default function AuthContextProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

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
		// 1️⃣ Restore session on app start
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			if (data.session) {
				fetchProfile(data.session.user.id);
			}
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
		() => ({ session, profile, loading }),
		[session, profile, loading],
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
