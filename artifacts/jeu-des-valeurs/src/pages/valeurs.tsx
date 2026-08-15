import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListCartesSession,
  getListCartesSessionQueryKey,
  useUpdateCarteSession,
  useUpdateSession,
  type CarteSessionFamille,
} from "@workspace/api-client-react";
import {
  rechercherValeurs,
  suggererValeurs,
  themesValeurs,
  valeursAProposer,
  type SuggestionValeur,
  type ValeurCatalogue,
} from "@workspace/contenu";
import { useState, useEffect, useMemo } from "react";
import { MoveRight, MoveLeft, Plus, Check, Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalerErreur } from "@/hooks/use-erreur";

/** Il faut au moins deux valeurs distinctes pour qu'un duel existe. */
const MINIMUM_VALEURS = 2;

const etiquettes: Record<CarteSessionFamille, string> = {
  lignes_rouges: "Mes limites · Ce que je refuse",
  horizons: "Mes aspirations · Ce que je veux vivre",
  tresors: "Mes essentiels · Ce que je veux préserver",
};

/** Ce que la personne a écrit, et ce que le jeu croit y reconnaître. */
type Interpretation = {
  texte: string;
  suggestions: SuggestionValeur[];
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

  const majCarte = useUpdateCarteSession();
  const majSession = useUpdateSession();
  const signaler = useSignalerErreur();

  const [confirmees, setConfirmees] = useState<Record<number, string[]>>({});
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [saisie, setSaisie] = useState<Record<number, string>>({});
  const [interpretation, setInterpretation] = useState<
    Record<number, Interpretation | null>
  >({});
  const [recherche, setRecherche] = useState<Record<number, string>>({});

  // Rien n'est coché d'avance : une suggestion du jeu n'est pas une réponse.
  useEffect(() => {
    if (!mesCartes) return;
    setConfirmees((prev) => {
      const suivant = { ...prev };
      for (const c of mesCartes) {
        if (suivant[c.id] === undefined)
          suivant[c.id] = c.valeursConfirmées ?? [];
      }
      return suivant;
    });
  }, [mesCartes]);

  const enregistrer = (carteId: number, valeurs: string[]) => {
    setConfirmees((prev) => ({ ...prev, [carteId]: valeurs }));
    majCarte.mutate(
      {
        sessionId,
        carteSessionId: carteId,
        data: { valeursConfirmées: valeurs },
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListCartesSessionQueryKey(sessionId),
          }),
        onError: signaler("Choix pas enregistré"),
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

  const ajouter = (carteId: number, valeur: string) => {
    const actuelles = confirmees[carteId] ?? [];
    if (!actuelles.includes(valeur))
      enregistrer(carteId, [...actuelles, valeur]);
  };

  /**
   * Le texte libre ne devient jamais une valeur tout seul.
   *
   * Le jeu propose ce qu'il croit reconnaître, dit **pourquoi** il le propose,
   * et attend. « Aucune : garde mes mots » est une réponse complète : le texte
   * devient alors la valeur, tel quel.
   */
  const interpreter = (carteId: number) => {
    const texte = saisie[carteId]?.trim();
    if (!texte) return;
    setInterpretation((prev) => ({
      ...prev,
      [carteId]: { texte, suggestions: suggererValeurs(texte) },
    }));
  };

  const garderMesMots = (carteId: number) => {
    const courante = interpretation[carteId];
    if (!courante) return;
    ajouter(carteId, courante.texte);
    setSaisie((prev) => ({ ...prev, [carteId]: "" }));
    setInterpretation((prev) => ({ ...prev, [carteId]: null }));
  };

  const confirmerSuggestion = (carteId: number, valeur: string) => {
    ajouter(carteId, valeur);
    setSaisie((prev) => ({ ...prev, [carteId]: "" }));
    setInterpretation((prev) => ({ ...prev, [carteId]: null }));
  };

  const toutesLesValeurs = useMemo(
    () => Array.from(new Set(Object.values(confirmees).flat())),
    [confirmees],
  );

  const voisines = useMemo(
    () => valeursAProposer(toutesLesValeurs).slice(0, 12),
    [toutesLesValeurs],
  );

  const continuer = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "ordination" } },
      {
        onSuccess: () => setLocation(`/session/${sessionId}/partie`),
        onError: signaler("Impossible de continuer"),
      },
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

  const cartesNommees = mesCartes.filter(
    (c) => (confirmees[c.id] ?? []).length > 0,
  ).length;
  const pretPourLesDuels =
    toutesLesValeurs.length >= MINIMUM_VALEURS && cartesNommees >= 2;

  return (
    <Shell sessionId={sessionId} etape="valeurs">
      <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <header className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/session/${sessionId}/cartes`)}
            className="-ml-4 text-muted-foreground"
          >
            <MoveLeft className="w-4 h-4 mr-2" /> Ce qui compte pour moi
          </Button>
          <p className="eyebrow">Nommer</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Qu'est-ce que ça protège ?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Une même envie peut cacher des raisons très différentes. Pour chaque
            carte, garde seulement les mots qui expliquent vraiment pourquoi elle
            compte — ou écris les tiens. C'est ce que le jeu comparera ensuite :
            deux cartes qui protègent la même valeur ne s'affronteront jamais.
          </p>
        </header>

        <div className="space-y-4">
          {mesCartes.map((carte) => {
            const cochees = confirmees[carte.id] ?? [];
            const proposees = carte.valeursSuggérées ?? [];
            const horsCatalogue = cochees.filter((v) => !proposees.includes(v));
            const enCours = interpretation[carte.id];
            const terme = recherche[carte.id] ?? "";
            const resultats: ValeurCatalogue[] = terme.trim()
              ? rechercherValeurs(terme).slice(0, 12)
              : [];

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
                      C'est ta carte, alors c'est toi qui dis pourquoi elle
                      compte.
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
                      Je ne trouve pas ce qui me correspond
                    </button>
                  </div>

                  {ouvert === carte.id && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-5">
                      {/* ── Écrire dans ses mots ──────────────────────────── */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Dans tes mots</p>
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
                                interpreter(carte.id);
                              }
                            }}
                            aria-label="Écrire une raison dans mes mots"
                            placeholder="Ce que ça protège, pour moi…"
                            className="bg-background"
                          />
                          <Button
                            variant="secondary"
                            onClick={() => interpreter(carte.id)}
                            disabled={!saisie[carte.id]?.trim()}
                          >
                            Continuer
                          </Button>
                        </div>

                        {enCours && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                            <p className="text-sm">
                              Tu as écrit «&nbsp;
                              <span className="font-medium">
                                {enCours.texte}
                              </span>
                              &nbsp;».{" "}
                              {enCours.suggestions.length > 0
                                ? "Est-ce que ça veut dire une de ces valeurs ? C'est toi qui décides — le jeu ne fait que proposer."
                                : "Le jeu ne reconnaît rien de précis là-dedans, et c'est très bien."}
                            </p>
                            {enCours.suggestions.length > 0 && (
                              <ul className="space-y-2">
                                {enCours.suggestions.map((s) => (
                                  <li key={s.valeur}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmerSuggestion(carte.id, s.valeur)
                                      }
                                      className="w-full text-left rounded-lg border border-border bg-background p-3 hover:border-primary/60 transition-colors"
                                    >
                                      <span className="font-medium">
                                        {s.valeur}
                                      </span>
                                      <span className="block text-sm text-muted-foreground">
                                        {s.description}
                                      </span>
                                      <span className="block text-xs text-muted-foreground/80 mt-1">
                                        Proposé parce que tu as écrit «&nbsp;
                                        {s.motDeclencheur}&nbsp;».
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => garderMesMots(carte.id)}
                              >
                                Aucune : garde mes mots
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setInterpretation((prev) => ({
                                    ...prev,
                                    [carte.id]: null,
                                  }))
                                }
                              >
                                Reformuler
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Chercher par thème ────────────────────────────── */}
                      <div className="space-y-2">
                        <label
                          htmlFor={`recherche-${carte.id}`}
                          className="text-sm font-medium block"
                        >
                          Chercher par thème
                        </label>
                        <div className="flex items-center gap-2">
                          <Search
                            className="size-4 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <Input
                            id={`recherche-${carte.id}`}
                            value={terme}
                            onChange={(e) =>
                              setRecherche((prev) => ({
                                ...prev,
                                [carte.id]: e.target.value,
                              }))
                            }
                            placeholder="Ex. temps, argent, famille, vérité…"
                            className="bg-background"
                          />
                        </div>
                        {terme.trim() && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {resultats.length > 0 ? (
                              resultats.map((v) => (
                                <ChipValeur
                                  key={v.label}
                                  valeur={v.label}
                                  titre={v.description}
                                  actif={cochees.includes(v.label)}
                                  onClick={() => basculer(carte.id, v.label)}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Rien sous ce mot. Écris-le dans tes mots
                                ci-dessus.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Valeurs voisines ──────────────────────────────── */}
                      {voisines.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Valeurs voisines de celles que tu as déjà retenues
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {voisines.map((v) => (
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

                      {/* ── Le lexique complet, par famille ───────────────── */}
                      <details>
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none underline underline-offset-4 decoration-dotted">
                          Voir toutes les valeurs, par famille
                        </summary>
                        <div className="mt-3 space-y-3">
                          {themesValeurs().map(({ famille, valeurs }) => (
                            <div key={famille.id} className="space-y-1.5">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                {famille.label} — {famille.description}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {valeurs.map((v) => (
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
                          ))}
                        </div>
                      </details>
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
              : cartesNommees < 2
                ? "Nomme ce que protègent au moins deux cartes : un duel oppose deux cartes."
                : `${toutesLesValeurs.length} raisons retenues sur ${cartesNommees} cartes`}
          </p>
          <Button
            size="lg"
            disabled={!pretPourLesDuels || majSession.isPending}
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
