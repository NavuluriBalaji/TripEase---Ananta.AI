import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PastTripsPage() {
  const isLoggedIn = false; // This would be dynamic in a real app

  return (
    <div className="container mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Past Trips</CardTitle>
          <CardDescription>
            {isLoggedIn 
              ? "Here you can find all your previously generated trip itineraries."
              : "Log in to see your saved trip itineraries."
            }
          </CardDescription>
        </CardHeader>
        {!isLoggedIn && (
           <CardContent className="text-center">
             <p className="mb-4">It looks like you're not logged in.</p>
             <Button asChild>
                <Link href="/profile">Login or Sign Up</Link>
             </Button>
           </CardContent>
        )}
      </Card>
    </div>
  );
}
