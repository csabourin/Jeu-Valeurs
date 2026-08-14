import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useListCartessCatalogue,
  getListCartessCatalogueQueryKey,
  useListCartesSession,
  getListCartesSessionQueryKey,
  useAddCarteSession,
  useRemoveCarteSession,
  useUpdateSession,
  type CarteCatalogue,
  type CarteCatalogueFamille,
  type CarteSession,
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Check, Plus, MoveRight, Loader2, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalerErreur } from "@/hooks/use-erreur";

/** En dessous, il n'y a pas assez de matière pour construire des duels. */
const MINIMUM_CARTES = 3;

const familles: {
  cle: CarteCatalogueFamille;
  onglet: string;
  titre: string;
  invite: string;
  exemple: string;
}[] = [
  {
    cle: "lignes_rouges",
    onglet: "🛑 Lignes rouges",
    titre: "Mes lignes rouges",
    invite:
      "Des choses que tu ne te vois pas faire. Prends celles qui sonnent vrai pour toi — pas celles qui sonnent bien.",
    exemple: "Ex. : Laisser quelqu'un se faire accuser à ma place",
  },
  {
    cle: "horizons",
    onglet: "🌅 Horizons",
    titre: "Mes horizons",
    invite:
      "Ce que tu veux obtenir, réussir, devenir ou vivre. Ça peut être loin ou proche.",
    exemple: "Ex. : Devenir vraiment bon dans quelque chose que j'aime",
  },
  {
    cle: "tresors",
    onglet: "💎 Trésors",
    titre: "Mes trésors",
    invite: "Ce que tu as déjà et que tu ne veux pas perdre.",
    exemple: "Ex. : Le calme quand je rentre chez moi",
  },
];

export default function Cartes() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] = useState<CarteCatalogueFamille>("lignes_rouges");
  const [saisieLibre, setSaisieLibre] = useState<Record<string, string>>({});

  const { data: catalogue, isLoading: chargeCatalogue } = useListCartessCatalogue(
    undefined,
    { query: { queryKey: getListCartessCatalogueQueryKey() } },
  );

  const { data: mesCartes, isLoading: chargeMesCartes } = useListCartesSession(
    sessionId,
    {
      query: {
        enabled: !!sessionId,
        queryKey: getListCartesSessionQueryKey(sessionId),
      },
    },
  );

  const ajouter = useAddCarteSession();
  const retirer = useRemoveCarteSession();
  const majSession = useUpdateSession();
  const signaler = useSignalerErreur();

  const rafraichir = () =>
    queryClient.invalidateQueries({
      queryKey: getListCartesSessionQueryKey(sessionId),
    });

  const choisies = useMemo(() => {
    const parId = new Map<number, CarteSession>();
    for (const c of mesCartes ?? []) {
      if (c.catalogueCarteId != null) parId.set(c.catalogueCarteId, c);
    }
    return parId;
  }, [mesCartes]);

  const basculerCarte = (carte: CarteCatalogue) => {
    const deja = choisies.get(carte.id);
    if (deja) {
      retirer.mutate(
        { sessionId, carteSessionId: deja.id },
        { onSuccess: rafraichir, onError: signaler("Carte pas retirée") },
      );
      return;
    }
    ajouter.mutate(
      {
        sessionId,
        data: {
          catalogueCarteId: carte.id,
          famille: carte.famille,
          label: carte.label,
          description: carte.description,
          valeursSuggérées: carte.valeursSuggérées,
          estPersonnalisée: false,
        },
      },
      { onSuccess: rafraichir, onError: signaler("Carte pas ajoutée") },
    );
  };

  const ajouterLaMienne = (famille: CarteCatalogueFamille) => {
    const texte = saisieLibre[famille]?.trim();
    if (!texte) return;
    ajouter.mutate(
      {
        sessionId,
        data: {
          famille,
          label: texte,
          // Aucune valeur suggérée : le jeu ne devine pas ce que la personne
          // a voulu dire. Elle nommera elle-même à l'étape suivante.
          valeursSuggérées: [],
          estPersonnalisée: true,
        },
      },
      {
        onSuccess: () => {
          setSaisieLibre((prev) => ({ ...prev, [famille]: "" }));
          rafraichir();
        },
        onError: signaler("Carte pas ajoutée"),
      },
    );
  };

  const continuer = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "confirmation_valeurs" } },
      {
        onSuccess: () => setLocation(`/session/${sessionId}/valeurs`),
        onError: signaler("Impossible de continuer"),
      },
    );
  };

  if (chargeCatalogue || chargeMesCartes) {
    return (
      <Shell sessionId={sessionId} etape="cartes">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const total = mesCartes?.length ?? 0;
  const manquantes = Math.max(0, MINIMUM_CARTES - total);

  return (
    <Shell sessionId={sessionId} etape="cartes">
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-serif font-bold">Prends tes cartes</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Choisis ce qui compte pour toi dans les trois piles. Trois cartes
            suffisent pour commencer, mais plus tu en prends, plus les duels
            seront serrés.
          </p>
        </header>

        <Tabs
          value={ongletActif}
          onValueChange={(v) => setOngletActif(v as CarteCatalogueFamille)}
        >
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl">
            {familles.map((f) => (
              <TabsTrigger
                key={f.cle}
                value={f.cle}
                className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
              >
                <span className="font-serif text-sm md:text-base">{f.onglet}</span>
                <span className="ml-2 hidden sm:inline-flex bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {mesCartes?.filter((c) => c.famille === f.cle).length ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {familles.map((f) => {
            const dansLaPile = (catalogue ?? []).filter((c) => c.famille === f.cle);
            const perso = (mesCartes ?? []).filter(
              (c) => c.famille === f.cle && c.estPersonnalisée,
            );

            return (
              <TabsContent
                key={f.cle}
                value={f.cle}
                className="mt-6 space-y-6 focus-visible:outline-none"
              >
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h2 className="text-xl font-serif font-semibold mb-1">{f.titre}</h2>
                  <p className="text-muted-foreground">{f.invite}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dansLaPile.map((carte) => {
                    const prise = choisies.has(carte.id);
                    return (
                      <button
                        key={carte.id}
                        type="button"
                        aria-pressed={prise}
                        onClick={() => basculerCarte(carte)}
                        data-testid={`carte-${carte.id}`}
                        className={`text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          prise
                            ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                            : "border-border/60 bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <span className="font-medium leading-snug">{carte.label}</span>
                          <span
                            aria-hidden="true"
                            className={`rounded-full p-1 border shrink-0 ${
                              prise
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border"
                            }`}
                          >
                            {prise ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </span>
                        </div>
                        {carte.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {carte.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {carte.valeursSuggérées.map((v) => (
                            <Badge
                              key={v}
                              variant="secondary"
                              className="text-[10px] font-normal opacity-80"
                            >
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-dashed border-border p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">Écris la tienne</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Si rien ne correspond, dis-le dans tes mots. {f.exemple}
                  </p>

                  {perso.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {perso.map((c) => (
                        <li key={c.id}>
                          <span className="inline-flex items-center gap-2 bg-primary/10 text-foreground text-sm rounded-full pl-3 pr-1 py-1">
                            {c.label}
                            <button
                              type="button"
                              onClick={() =>
                                retirer.mutate(
                                  { sessionId, carteSessionId: c.id },
                                  { onSuccess: rafraichir },
                                )
                              }
                              aria-label={`Retirer la carte ${c.label}`}
                              className="rounded-full p-1 hover:bg-background/80"
                            >
                              <Plus className="w-3.5 h-3.5 rotate-45" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      value={saisieLibre[f.cle] ?? ""}
                      onChange={(e) =>
                        setSaisieLibre((prev) => ({ ...prev, [f.cle]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          ajouterLaMienne(f.cle);
                        }
                      }}
                      aria-label={`Ajouter une carte à « ${f.titre} »`}
                      placeholder="Dans tes mots…"
                      className="bg-background"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => ajouterLaMienne(f.cle)}
                      disabled={!saisieLibre[f.cle]?.trim() || ajouter.isPending}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-t border-border/40 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {total} carte{total > 1 ? "s" : ""} prise{total > 1 ? "s" : ""}
            {manquantes > 0 && ` — encore ${manquantes} pour commencer`}
          </p>
          <Button
            size="lg"
            disabled={total < MINIMUM_CARTES || majSession.isPending}
            onClick={continuer}
          >
            Continuer <MoveRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Shell>
  );
}
