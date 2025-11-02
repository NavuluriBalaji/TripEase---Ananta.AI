import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';

export default function DestinationsPage() {
  const destinationImages = placeholderImages.filter(img => img.id.startsWith('dest-'));

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">Explore Destinations</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Let your curiosity guide you to your next unforgettable journey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {destinationImages.map((image) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="relative h-48 w-full">
              <Image
                src={image.imageUrl}
                alt={image.description}
                fill
                className="object-cover"
                data-ai-hint={image.imageHint}
              />
            </div>
            <CardHeader>
              <CardTitle>{image.title}</CardTitle>
              <CardDescription className="text-sm pt-1">{image.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
