import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import React, { createContext, use, useEffect, useState } from "react";

const AuthContext = createContext<{ session: Session | null } | null>(null);

export default function AuthContextProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session, setSession] = useState<Session | null>(null);

	useEffect(() => {
		// Get initial session
		const getInitialSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setSession(session);
		};

		getInitialSession();

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		// Cleanup subscription on unmount
		return () => {
			subscription.unsubscribe();
		};
	}, []);

	return <AuthContext value={{ session }}>{children}</AuthContext>;
}

export const useAuth = () => {
	const context = use(AuthContext);

	if (context === null) {
		throw new Error("useAuth must be used within an AuthContextProvider");
	}

	return context;
};
