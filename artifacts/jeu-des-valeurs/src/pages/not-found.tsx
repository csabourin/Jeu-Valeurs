import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <h1 className="text-6xl font-serif font-bold text-foreground mb-4">
        404
      </h1>
      <p className="text-xl text-muted-foreground mb-8">
        Ce territoire n'est pas sur la carte.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Retour au camp de base
      </Link>
    </div>
  );
}
