import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import React, { createContext, use, useEffect, useState } from "react";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export default function AuthContextProvider({
	children,
}: {
	children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    // 1️⃣ Restore session on app start
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2️⃣ Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

	return <AuthContext value={{ session, loading }}>{children}</AuthContext>;
}

export const useAuth = () => {
	const context = use(AuthContext);

	if (context === null) {
		throw new Error("useAuth must be used within an AuthContextProvider");
	}

	return context;
};
