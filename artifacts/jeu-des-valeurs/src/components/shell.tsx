import { useLocation, Link } from "wouter";
import { Button } from "./ui/button";
import { useDeleteSession } from "@workspace/api-client-react";
import { Trash2, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export function Shell({ children, sessionId }: { children: React.ReactNode, sessionId?: string }) {
  const [, setLocation] = useLocation();
  const deleteSession = useDeleteSession();
  const { toast } = useToast();

  const handleDelete = () => {
    if (sessionId) {
      deleteSession.mutate({ sessionId }, {
        onSuccess: () => {
          localStorage.removeItem('jdv_session_id');
          toast({
            title: "Données supprimées",
            description: "Votre session a été effacée de cet appareil et du serveur.",
          });
          setLocation('/');
        }
      });
    } else {
      localStorage.removeItem('jdv_session_id');
      setLocation('/');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -ml-1">
            <Compass className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-serif font-semibold text-lg text-foreground tracking-wide">Jeu des valeurs</span>
          </Link>

          {(sessionId || localStorage.getItem('jdv_session_id')) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Supprimer mes données</span>
                  <span className="sm:hidden">Supprimer</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer toute cette exploration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les cartes personnelles, les réponses et les résultats de cette session seront supprimés du serveur. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Conserver mes données</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col">
        {children}
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground mt-auto">
        <p>Une exploration introspective.</p>
      </footer>
    </div>
  );
}
