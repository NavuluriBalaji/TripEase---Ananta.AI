import Image from 'next/image';
import TripPlanner from '@/components/trip-planner';
import { placeholderImages } from '@/lib/placeholder-images';

export default function HomePage() {
  const heroImage = placeholderImages.find(img => img.id === 'hero-kyoto');

  return (
    <>
      <section className="relative w-full h-[50vh] bg-muted">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative container mx-auto flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground">
            Your Perfect Trip, Crafted by AI
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl text-muted-foreground">
            Tell us your dreams, we&apos;ll handle the details. From weekend getaways to epic adventures, TripEase creates personalized itineraries in seconds.
          </p>
        </div>
      </section>
      <TripPlanner />
    </>
  );
}
