import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Favorites</h1>
        <p className="text-gray-600 mb-8">Your saved trips and destinations</p>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorites Yet</h3>
            <p className="text-gray-600">Save your favorite trips and destinations to see them here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
