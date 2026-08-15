import { useLocation, Link } from "wouter";
import { Button } from "./ui/button";
import { useDeleteSession } from "@workspace/api-client-react";
import { Compass, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type EtapeVisuelle = "cartes" | "valeurs" | "partie" | "constellation";

const etapes: { cle: EtapeVisuelle; nom: string; court: string }[] = [
  { cle: "cartes", nom: "Ce qui compte", court: "Choisir" },
  { cle: "valeurs", nom: "Ce que ça protège", court: "Préciser" },
  { cle: "partie", nom: "Tes choix", court: "Arbitrer" },
  { cle: "constellation", nom: "Ton portrait", court: "Découvrir" },
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
            title: "Parcours effacé",
            description:
              "Tes choix et tes réponses ont été supprimés de cet appareil et du serveur.",
          });
          setLocation("/");
        },
      },
    );
  };

  const rangCourant = etapes.findIndex((e) => e.cle === etape);

  return (
    <div className="app-shell min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="brand-mark group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <span className="brand-compass">
              <Compass className="size-5 group-hover:rotate-12 transition-transform duration-300" />
            </span>
            <span className="leading-none">
              <strong className="block font-serif text-lg">Boussole</strong>
              <small className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                le jeu des valeurs
              </small>
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
              <Trash2 className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Effacer mon parcours</span>
            </Button>
          )}
        </div>

        {rangCourant >= 0 && (
          <nav aria-label="Progression du parcours" className="progress-nav">
            <ol className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              {etapes.map((e, i) => {
                const etat =
                  i < rangCourant
                    ? "faite"
                    : i === rangCourant
                      ? "courante"
                      : "avenir";
                return (
                  <li key={e.cle} className="progress-step">
                    <span
                      aria-current={etat === "courante" ? "step" : undefined}
                      className={`progress-dot progress-dot-${etat}`}
                    >
                      {i < rangCourant ? "✓" : i + 1}
                    </span>
                    <span className={`progress-label progress-label-${etat}`}>
                      <span className="hidden sm:inline">{e.nom}</span>
                      <span className="sm:hidden">{e.court}</span>
                    </span>
                    {i < etapes.length - 1 && (
                      <span
                        className={`progress-line ${i < rangCourant ? "progress-line-done" : ""}`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      <main className="relative z-10 flex-1 container max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col">
        {children}
      </main>

      <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground mt-auto px-4">
        <p>
          Un jeu d'introspection — pas un test, un diagnostic ou une vérité
          figée.
        </p>
      </footer>
    </div>
  );
}
