import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Scale } from "lucide-react";
import {
  useCreateArbitrage,
  getGetProgresQueryKey,
  type BlocArbitrage as Bloc,
  type CarteArbitrable,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const emojis: Record<CarteArbitrable["famille"], string> = {
  lignes_rouges: "🛑",
  horizons: "🌅",
  tresors: "💎",
};

type Etape = "meilleure" | "pire";

/**
 * Un bloc d'arbitrage : quatre cartes de la personne, côte à côte, sans
 * situation autour.
 *
 * On demande les deux extrêmes plutôt qu'un classement complet : ordonner
 * quatre cartes est une corvée, et le milieu ne veut rien dire. En deux clics
 * on obtient le haut et le bas, ce qui suffit à situer chaque carte une fois
 * les blocs recoupés.
 *
 * La carte choisie « la plus importante » disparaît de la seconde question :
 * la même carte ne peut pas être aux deux bouts, et l'empêcher à l'écran vaut
 * mieux que refuser après coup.
 */
export function BlocArbitrage({
  sessionId,
  bloc,
  repondus,
  planifies,
}: {
  sessionId: string;
  bloc: Bloc;
  repondus: number;
  planifies: number;
}) {
  const queryClient = useQueryClient();
  const creer = useCreateArbitrage();
  const { toast } = useToast();

  const [etape, setEtape] = useState<Etape>("meilleure");
  const [meilleure, setMeilleure] = useState<string | null>(null);
  // Verrou local : la mutation finit avant que le bloc suivant soit revenu du
  // serveur. Sans lui, deux clics rapides répondent deux fois au même bloc.
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Chaque nouveau bloc repart à neuf.
  useEffect(() => {
    setEtape("meilleure");
    setMeilleure(null);
    setEnvoiEnCours(false);
  }, [bloc.bloc]);

  const envoyer = (carteMeilleure: string | null, cartePire: string | null) => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);

    creer.mutate(
      {
        sessionId,
        data: {
          bloc: bloc.bloc,
          carteIds: bloc.cartes.map((c) => c.id),
          carteMeilleure,
          cartePire,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetProgresQueryKey(sessionId),
          });
        },
        onError: () => {
          setEnvoiEnCours(false);
          toast({
            title: "Choix pas enregistré",
            description: "La connexion a flanché. Réessaie — rien n'est perdu.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const choisir = (carteId: string) => {
    if (envoiEnCours) return;
    if (etape === "meilleure") {
      setMeilleure(carteId);
      setEtape("pire");
      return;
    }
    envoyer(meilleure, carteId);
  };

  const restantes =
    etape === "pire" ? bloc.cartes.filter((c) => c.id !== meilleure) : bloc.cartes;

  const avancement = planifies > 0 ? (repondus / planifies) * 100 : 0;
  const enCours = creer.isPending || envoiEnCours;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
          <span className="inline-flex items-center gap-2">
            <Scale className="w-4 h-4" aria-hidden="true" /> Tes cartes entre elles
          </span>
          <span>
            {repondus} / {planifies}
          </span>
        </div>
        <Progress
          value={Math.min(100, Math.max(0, avancement))}
          className="h-2"
        />
      </div>

      <div className="space-y-2 animate-in fade-in slide-in-from-right-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Pas de situation ici — juste tes cartes
        </p>
        <h1 className="text-xl md:text-2xl font-serif leading-snug">
          {etape === "meilleure"
            ? "Parmi ces cartes, laquelle compte le plus pour toi ?"
            : "Et parmi celles qui restent, laquelle compte le moins ?"}
        </h1>
      </div>

      <div
        role="group"
        aria-label={
          etape === "meilleure"
            ? "La carte qui compte le plus"
            : "La carte qui compte le moins"
        }
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {restantes.map((carte) => (
          <button
            key={carte.id}
            type="button"
            disabled={enCours}
            onClick={() => choisir(carte.id)}
            className="group text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="text-xl" aria-hidden="true">
              {emojis[carte.famille]}
            </span>
            <p className="mt-2 font-medium leading-snug group-hover:text-primary transition-colors">
              {carte.label}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {etape === "pire" && (
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={enCours}
            onClick={() => {
              setMeilleure(null);
              setEtape("meilleure");
            }}
          >
            Revenir en arrière
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-full"
          disabled={enCours}
          onClick={() => envoyer(null, null)}
        >
          Passer ce groupe
        </Button>
        {enCours && (
          <Loader2
            className="w-4 h-4 animate-spin text-muted-foreground"
            aria-label="Envoi en cours"
          />
        )}
      </div>
    </div>
  );
}
