import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  // Placeholder user data
  const user = {
    name: "Alex Doe",
    email: "alex.doe@example.com",
    initials: "AD",
    imageUrl: ""
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            {user.imageUrl && <AvatarImage src={user.imageUrl} alt={user.name} />}
            <AvatarFallback className="text-3xl">{user.initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">This is a placeholder profile page. In a real application, you could edit your details here.</p>
            <Button variant="outline">Edit Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
