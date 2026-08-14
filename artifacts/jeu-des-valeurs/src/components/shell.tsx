import { useLocation, Link } from "wouter";
import { Button } from "./ui/button";
import { useDeleteSession } from "@workspace/api-client-react";
import { Trash2, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type EtapeVisuelle = "cartes" | "valeurs" | "partie" | "constellation";

const etapes: { cle: EtapeVisuelle; nom: string }[] = [
  { cle: "cartes", nom: "Tes cartes" },
  { cle: "valeurs", nom: "Tes mots" },
  { cle: "partie", nom: "La partie" },
  { cle: "constellation", nom: "Ta carte" },
];

export function Shell({
  children,
  sessionId,
  etape,
}: {
  children: React.ReactNode;
  sessionId?: string;
  etape?: EtapeVisuelle;
}) {
  const [, setLocation] = useLocation();
  const deleteSession = useDeleteSession();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!sessionId) {
      localStorage.removeItem("jdv_session_id");
      setLocation("/");
      return;
    }
    deleteSession.mutate(
      { sessionId },
      {
        onSuccess: () => {
          localStorage.removeItem("jdv_session_id");
          toast({
            title: "Partie effacée",
            description:
              "Tes cartes et tes réponses ont été supprimées de cet appareil et du serveur.",
          });
          setLocation("/");
        },
      },
    );
  };

  const rangCourant = etapes.findIndex((e) => e.cle === etape);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -ml-1 shrink-0"
          >
            <Swords className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-serif font-semibold text-lg text-foreground tracking-wide">
              Le jeu des valeurs
            </span>
          </Link>

          {sessionId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteSession.isPending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Effacer ma partie</span>
            </Button>
          )}
        </div>

        {rangCourant >= 0 && (
          <nav
            aria-label="Progression de la partie"
            className="border-t border-border/30 bg-muted/20"
          >
            <ol className="container max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 text-xs overflow-x-auto">
              {etapes.map((e, i) => {
                const etat =
                  i < rangCourant ? "faite" : i === rangCourant ? "courante" : "avenir";
                return (
                  <li key={e.cle} className="flex items-center gap-2 shrink-0">
                    {i > 0 && <span aria-hidden="true" className="text-border">—</span>}
                    <span
                      aria-current={etat === "courante" ? "step" : undefined}
                      className={
                        etat === "courante"
                          ? "font-semibold text-foreground"
                          : etat === "faite"
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50"
                      }
                    >
                      {e.nom}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col">
        {children}
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground mt-auto px-4">
        <p>
          Un jeu. Pas un test, pas un diagnostic, pas une vérité sur toi.
        </p>
      </footer>
    </div>
  );
}
