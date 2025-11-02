"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { currentUser, userProfile, loading } = useAuth();

  const email = currentUser?.email || userProfile?.email || "";

  const displayName = useMemo(() => {
    if (userProfile?.displayName && userProfile.displayName.trim()) return userProfile.displayName;
    if (currentUser?.displayName && currentUser.displayName.trim()) return currentUser.displayName;
    if (email) {
      const local = email.split("@")[0] || "";
      return local
        .replace(/[._-]+/g, " ")
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
    }
    return "";
  }, [userProfile?.displayName, currentUser?.displayName, email]);

  const photoURL = userProfile?.photoURL || currentUser?.photoURL || "";

  const initials = useMemo(() => {
    const base = displayName || email || "User";
    const parts = base.split(/[\s@]+/);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [displayName, email]);

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            {photoURL ? (
              <AvatarImage src={photoURL} alt={displayName || "User"} />
            ) : null}
            <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{displayName || "Your Name"}</CardTitle>
          <CardDescription>{email || "you@example.com"}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {loading ? (
            <p className="text-muted-foreground">Loading your profile…</p>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">Manage your personal details and preferences.</p>
              <Link href="/settings">
                <Button variant="outline">Edit Profile</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
