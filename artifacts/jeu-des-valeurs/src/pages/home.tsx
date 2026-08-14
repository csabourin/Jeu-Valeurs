import { useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateSession,
  useGetSession,
  getGetSessionQueryKey,
  type SessionEtapeCourante,
} from "@workspace/api-client-react";
import { Layers, Swords, SlidersHorizontal, MoveRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

/** Où reprendre une partie selon l'étape enregistrée. */
const chemins: Record<SessionEtapeCourante, string> = {
  accueil: "cartes",
  selection_cartes: "cartes",
  confirmation_valeurs: "valeurs",
  collisions: "partie",
  bascules: "partie",
  constellation: "constellation",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [partieEnCours, setPartieEnCours] = useState<string | null>(null);

  useEffect(() => {
    setPartieEnCours(localStorage.getItem("jdv_session_id"));
  }, []);

  const creerSession = useCreateSession();
  const { toast } = useToast();
  const { data: session, isError } = useGetSession(partieEnCours ?? "", {
    query: {
      enabled: !!partieEnCours,
      retry: false,
      queryKey: getGetSessionQueryKey(partieEnCours ?? ""),
    },
  });

  // Une partie effacée côté serveur ne doit pas rester proposée ici.
  useEffect(() => {
    if (isError) {
      localStorage.removeItem("jdv_session_id");
      setPartieEnCours(null);
    }
  }, [isError]);

  const commencer = () => {
    creerSession.mutate(
      { data: { etapeCourante: "selection_cartes" } },
      {
        onSuccess: (nouvelle) => {
          localStorage.setItem("jdv_session_id", nouvelle.id);
          setLocation(`/session/${nouvelle.id}/cartes`);
        },
        // Sans ceci, un serveur en échec donnait un bouton qui ne fait
        // simplement rien — impossible à diagnostiquer depuis l'écran.
        onError: (erreur) => {
          toast({
            title: "La partie n'a pas pu démarrer",
            description: erreur.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const reprendre = () => {
    if (!session) return;
    setLocation(`/session/${session.id}/${chemins[session.etapeCourante]}`);
  };

  return (
    <Shell sessionId={session?.id}>
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center space-y-10">
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground font-semibold leading-tight">
            Qu'est-ce qui gagne quand{" "}
            <span className="text-primary italic">tout ne peut pas gagner</span> ?
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Tu choisis tes cartes. Le jeu les met en duel. À la fin, tu vois ce
            qui a tenu, ce qui a plié, et à partir d'où.
          </p>
        </div>

        <Card className="w-full bg-card/50 backdrop-blur-sm border-border/50 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-150">
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <Layers className="w-6 h-6 text-secondary" />
                <h2 className="font-semibold text-base font-serif">1. Tes cartes</h2>
                <p className="text-sm text-muted-foreground">
                  Tes lignes rouges, tes horizons, tes trésors. Tu peux aussi
                  écrire les tiennes.
                </p>
              </div>
              <div className="space-y-2">
                <Swords className="w-6 h-6 text-primary" />
                <h2 className="font-semibold text-base font-serif">2. Les duels</h2>
                <p className="text-sm text-muted-foreground">
                  Des situations où deux de tes cartes ne peuvent pas gagner
                  ensemble. Tu tranches.
                </p>
              </div>
              <div className="space-y-2">
                <SlidersHorizontal className="w-6 h-6 text-accent" />
                <h2 className="font-semibold text-base font-serif">
                  3. Les bascules
                </h2>
                <p className="text-sm text-muted-foreground">
                  La même situation, un seul réglage qui monte. Jusqu'où ta
                  réponse tient-elle ?
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-left border border-border/50 space-y-2">
              <p className="font-semibold text-foreground">Les règles du jeu</p>
              <ul className="space-y-1 list-disc list-inside marker:text-primary/60">
                <li>Aucune réponse ne rapporte de points. Il n'y a rien à gagner.</li>
                <li>Tu peux passer n'importe quelle question, sans la justifier.</li>
                <li>
                  Ce que tu réponds reste sur cet appareil et sur le serveur du
                  jeu, jusqu'à ce que tu effaces ta partie.
                </li>
                <li>
                  Le jeu ne devine rien sur toi : ni humeur, ni croyance, ni
                  quoi que ce soit d'autre. Il compte ce que tu as choisi.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {session ? (
                <>
                  <Button
                    size="lg"
                    onClick={reprendre}
                    className="w-full sm:w-auto text-base h-12 px-8"
                  >
                    Reprendre ma partie <MoveRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={commencer}
                    disabled={creerSession.isPending}
                    className="w-full sm:w-auto text-base h-12 px-8"
                  >
                    Nouvelle partie
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={commencer}
                  className="w-full sm:w-auto text-base h-12 px-8 shadow-md"
                  disabled={creerSession.isPending}
                >
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Commencer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
