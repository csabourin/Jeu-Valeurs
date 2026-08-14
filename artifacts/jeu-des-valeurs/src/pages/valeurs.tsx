import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListCartesSession,
  getListCartesSessionQueryKey,
  useListValeursCatalogue,
  getListValeursCatalogueQueryKey,
  useUpdateCarteSession,
  useUpdateSession,
  type CarteSessionFamille,
} from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { MoveRight, MoveLeft, Plus, Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/** Il faut au moins deux valeurs distinctes pour qu'un duel existe. */
const MINIMUM_VALEURS = 2;

const etiquettes: Record<CarteSessionFamille, string> = {
  lignes_rouges: "🛑 Ligne rouge",
  horizons: "🌅 Horizon",
  tresors: "💎 Trésor",
};

export default function Valeurs() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: mesCartes, isLoading } = useListCartesSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListCartesSessionQueryKey(sessionId),
    },
  });

  const { data: catalogueValeurs } = useListValeursCatalogue({
    query: { queryKey: getListValeursCatalogueQueryKey() },
  });

  const majCarte = useUpdateCarteSession();
  const majSession = useUpdateSession();

  const [confirmees, setConfirmees] = useState<Record<number, string[]>>({});
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [saisie, setSaisie] = useState<Record<number, string>>({});

  // Rien n'est coché d'avance : une suggestion du jeu n'est pas une réponse.
  useEffect(() => {
    if (!mesCartes) return;
    setConfirmees((prev) => {
      const suivant = { ...prev };
      for (const c of mesCartes) {
        if (suivant[c.id] === undefined) suivant[c.id] = c.valeursConfirmées ?? [];
      }
      return suivant;
    });
  }, [mesCartes]);

  const enregistrer = (carteId: number, valeurs: string[]) => {
    setConfirmees((prev) => ({ ...prev, [carteId]: valeurs }));
    majCarte.mutate(
      { sessionId, carteSessionId: carteId, data: { valeursConfirmées: valeurs } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListCartesSessionQueryKey(sessionId),
          }),
      },
    );
  };

  const basculer = (carteId: number, valeur: string) => {
    const actuelles = confirmees[carteId] ?? [];
    enregistrer(
      carteId,
      actuelles.includes(valeur)
        ? actuelles.filter((v) => v !== valeur)
        : [...actuelles, valeur],
    );
  };

  const ajouterLibre = (carteId: number) => {
    const texte = saisie[carteId]?.trim();
    if (!texte) return;
    const actuelles = confirmees[carteId] ?? [];
    if (!actuelles.includes(texte)) enregistrer(carteId, [...actuelles, texte]);
    setSaisie((prev) => ({ ...prev, [carteId]: "" }));
  };

  const toutesLesValeurs = Array.from(
    new Set(Object.values(confirmees).flat()),
  );

  const continuer = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "collisions" } },
      { onSuccess: () => setLocation(`/session/${sessionId}/partie`) },
    );
  };

  if (isLoading) {
    return (
      <Shell sessionId={sessionId} etape="valeurs">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!mesCartes || mesCartes.length === 0) {
    return (
      <Shell sessionId={sessionId} etape="valeurs">
        <div className="text-center py-20 space-y-4">
          <h1 className="text-2xl font-serif">Il n'y a pas encore de cartes</h1>
          <Button onClick={() => setLocation(`/session/${sessionId}/cartes`)}>
            Aller prendre des cartes
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell sessionId={sessionId} etape="valeurs">
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/session/${sessionId}/cartes`)}
            className="-ml-4 text-muted-foreground"
          >
            <MoveLeft className="w-4 h-4 mr-2" /> Mes cartes
          </Button>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">
            Pourquoi cette carte ?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Pour chaque carte, le jeu propose des raisons possibles. Garde
            seulement celles qui sont vraies pour toi — et ajoute les tiennes si
            aucune ne l'est. Rien n'est coché d'avance : ce n'est pas au jeu de
            décider ce que tu voulais dire.
          </p>
        </header>

        <div className="space-y-4">
          {mesCartes.map((carte) => {
            const cochees = confirmees[carte.id] ?? [];
            const proposees = carte.valeursSuggérées ?? [];
            const autres = (catalogueValeurs ?? []).filter(
              (v) => !proposees.includes(v.label),
            );
            const horsCatalogue = cochees.filter(
              (v) =>
                !proposees.includes(v) &&
                !(catalogueValeurs ?? []).some((c) => c.label === v),
            );

            return (
              <section
                key={carte.id}
                className="border border-border/60 rounded-xl overflow-hidden bg-card"
              >
                <div className="bg-muted/30 px-5 py-4 border-b border-border/40">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {etiquettes[carte.famille]}
                  </p>
                  <h2 className="text-lg font-medium mt-1">{carte.label}</h2>
                </div>

                <div className="p-5 space-y-4">
                  {proposees.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Est-ce que c'est pour une de ces raisons ?
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      C'est ta carte, alors c'est toi qui dis pourquoi elle compte.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {[...proposees, ...horsCatalogue].map((valeur) => (
                      <ChipValeur
                        key={valeur}
                        valeur={valeur}
                        actif={cochees.includes(valeur)}
                        onClick={() => basculer(carte.id, valeur)}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setOuvert(ouvert === carte.id ? null : carte.id)
                      }
                      aria-expanded={ouvert === carte.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      Autre chose
                    </button>
                  </div>

                  {ouvert === carte.id && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={saisie[carte.id] ?? ""}
                          onChange={(e) =>
                            setSaisie((prev) => ({
                              ...prev,
                              [carte.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              ajouterLibre(carte.id);
                            }
                          }}
                          aria-label="Écrire une raison dans mes mots"
                          placeholder="Dans tes mots…"
                          className="bg-background"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => ajouterLibre(carte.id)}
                          disabled={!saisie[carte.id]?.trim()}
                        >
                          Ajouter
                        </Button>
                      </div>

                      {autres.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Ou choisis dans la liste
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {autres.map((v) => (
                              <ChipValeur
                                key={v.label}
                                valeur={v.label}
                                titre={v.description}
                                actif={cochees.includes(v.label)}
                                onClick={() => basculer(carte.id, v.label)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-t border-border/40 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {toutesLesValeurs.length < MINIMUM_VALEURS
              ? "Il faut au moins deux raisons différentes pour que le jeu puisse les opposer."
              : `${toutesLesValeurs.length} raisons retenues`}
          </p>
          <Button
            size="lg"
            disabled={toutesLesValeurs.length < MINIMUM_VALEURS || majSession.isPending}
            onClick={continuer}
          >
            Aux duels <MoveRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function ChipValeur({
  valeur,
  actif,
  titre,
  onClick,
}: {
  valeur: string;
  actif: boolean;
  titre?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      title={titre}
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        actif
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:border-primary/50"
      }`}
    >
      {actif && <Check className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />}
      {valeur}
    </button>
  );
}
