import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  useGetConstellation,
  getGetConstellationQueryKey,
  useGetProgres,
  getGetProgresQueryKey,
  useListReponses,
  getListReponsesQueryKey,
  useListCartesSession,
  getListCartesSessionQueryKey,
  useUpdateSession,
  type LigneOrdination,
  type ObservationConstellation,
  type ReponseCollision,
} from "@workspace/api-client-react";
import {
  trouverDuel,
  trouverSerie,
  trouverPalier,
  libellesConfiance,
  libellesDimension,
  libellesContexte,
  duelsCartesPossibles,
  termes,
} from "@workspace/contenu";
import type {
  Contexte,
  Dimension,
  DuelCarteContenu,
  NiveauConfiance,
} from "@workspace/contenu";
import { useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Compass,
  Scale,
  Users,
  Sparkles,
  Repeat,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/** Titre et ton de chaque type d'observation. */
const rubriques: Record<
  ObservationConstellation["type"],
  { titre: string; ton: string }
> = {
  ordination: {
    titre: "Où en est l'ordre",
    ton: "border-primary/30 bg-primary/5",
  },
  valeur_forte: {
    titre: "Régulièrement prioritaire",
    ton: "border-primary/30 bg-primary/5",
  },
  valeur_contextuelle: {
    titre: "Ça dépend de la situation",
    ton: "border-border bg-card",
  },
  valeur_protegee: {
    titre: "Jamais secondaire jusqu'ici",
    ton: "border-secondary/30 bg-secondary/5",
  },
  tension: { titre: "Tension", ton: "border-border bg-card" },
  stabilite: {
    titre: "Même tension, autre forme",
    ton: "border-border bg-card",
  },
  point_de_bascule: {
    titre: "Point de bascule",
    ton: "border-accent/40 bg-accent/5",
  },
  cycle: { titre: "Ça tourne en rond", ton: "border-accent/40 bg-accent/5" },
  territoire_inexplore: {
    titre: "Pas encore exploré",
    ton: "border-border bg-muted/30",
  },
  couverture: { titre: "Ce que ça couvre", ton: "border-border bg-muted/30" },
  confiance: {
    titre: "Niveau de confiance",
    ton: "border-border bg-muted/30",
  },
};

const tonConfiance: Record<NiveauConfiance, string> = {
  tendance_forte: "bg-secondary/15 text-secondary-foreground border-secondary/40",
  tendance_probable: "bg-primary/10 text-foreground border-primary/30",
  encore_incertain: "bg-muted text-muted-foreground border-border",
  territoire_peu_explore: "bg-muted text-muted-foreground border-border",
};

/** Retrouve la question jouée derrière une réponse, pour pouvoir la remontrer. */
function decrireReponse(
  r: ReponseCollision,
  duelsCartes: Map<number, DuelCarteContenu>,
): { situation: string; choix: string } | null {
  if (r.serieId && r.palier != null) {
    const serie = trouverSerie(r.serieId);
    const palier = trouverPalier(r.serieId, r.palier);
    if (!serie || !palier) return null;
    return {
      situation: palier.situation,
      choix:
        r.choix === "A"
          ? serie.optionA
          : r.choix === "B"
            ? serie.optionB
            : libelleChoix(r.choix),
    };
  }
  if (r.dilemmeId == null) return null;

  const duelCarte = duelsCartes.get(r.dilemmeId);
  if (duelCarte) {
    return {
      situation: duelCarte.situation,
      choix:
        r.choix === "A"
          ? duelCarte.optionA
          : r.choix === "B"
            ? duelCarte.optionB
            : libelleChoix(r.choix),
    };
  }

  const duel = trouverDuel(r.dilemmeId);
  if (!duel) return null;
  return {
    situation: duel.situation,
    choix:
      r.choix === "A"
        ? duel.optionA
        : r.choix === "B"
          ? duel.optionB
          : libelleChoix(r.choix),
  };
}

function libelleChoix(choix: string): string {
  const libelles: Record<string, string> = {
    ca_depend: "Tu as répondu « ça dépend »",
    je_ne_sais_pas: "Tu as répondu « je ne sais pas »",
    passer: "Tu as passé",
  };
  return libelles[choix] ?? choix;
}

export default function Constellation() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: constellation, isLoading } = useGetConstellation(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetConstellationQueryKey(sessionId),
    },
  });

  const { data: progres } = useGetProgres(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetProgresQueryKey(sessionId),
    },
  });

  const { data: reponses } = useListReponses(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListReponsesQueryKey(sessionId),
    },
  });

  const { data: cartes } = useListCartesSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListCartesSessionQueryKey(sessionId),
    },
  });

  const majSession = useUpdateSession();

  const duelsCartesParId = useMemo(
    () =>
      new Map(
        duelsCartesPossibles(
          (cartes ?? []).map((carte) => ({
            id: String(carte.id),
            famille: carte.famille,
            label: carte.label,
            valeursConfirmees: carte.valeursConfirmées,
          })),
        ).map((duel) => [duel.id, duel]),
      ),
    [cartes],
  );

  const parId = useMemo(() => {
    const index = new Map<number, ReponseCollision>();
    for (const r of reponses ?? []) index.set(r.id, r);
    return index;
  }, [reponses]);

  const mettreALepreuve = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "epreuve" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetProgresQueryKey(sessionId),
          });
          setLocation(`/session/${sessionId}/partie`);
        },
        onError: (erreur) =>
          toast({
            title: "Impossible de continuer",
            description: erreur.message,
            variant: "destructive",
          }),
      },
    );
  };

  if (isLoading || !constellation) {
    return (
      <Shell sessionId={sessionId} etape="constellation">
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-serif">On relie tes choix…</p>
        </div>
      </Shell>
    );
  }

  // Un champ d'API récent se lit comme s'il pouvait manquer : le frontend est un
  // paquet statique, l'API un service à part, et les deux ne se déploient pas au
  // même instant.
  const ordination = (constellation.ordination ?? []).filter(
    (l) => l.comparaisons > 0,
  );
  const inexplorees = (constellation.ordination ?? []).filter(
    (l) => l.comparaisons === 0,
  );
  const valeursFortes = constellation.valeursFortes ?? [];
  const valeursContextuelles = constellation.valeursContextuelles ?? [];
  const valeursProtegees = constellation.valeursProtegees ?? [];
  const tensionsPrincipales = constellation.tensionsPrincipales ?? [];
  const dimensionsSensibles = constellation.dimensionsSensibles ?? [];
  const cycles = constellation.cycles ?? [];
  const bascules = constellation.bascules ?? [];
  const observations = constellation.observations ?? [];
  const couverture = constellation.couverture;
  const confiance = (constellation.niveauConfianceGlobal ??
    "territoire_peu_explore") as NiveauConfiance;

  const rien = ordination.length === 0;

  return (
    <Shell sessionId={sessionId} etape="constellation">
      <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700">
        <header className="space-y-4 text-center max-w-2xl mx-auto">
          <p className="eyebrow mx-auto">Observer</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Ta constellation, pour l'instant
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Une carte des relations entre tes valeurs — pas un palmarès. Elle ne
            parle que des comparaisons déjà jouées, et elle bouge à chacune.
          </p>
          <p
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${tonConfiance[confiance]}`}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {libellesConfiance[confiance]}
          </p>
        </header>

        {rien ? (
          <div className="text-center space-y-4 py-12">
            <p className="text-muted-foreground">
              Il n'y a pas encore assez de choix tranchés pour dessiner quoi que
              ce soit.
            </p>
            <Button onClick={() => setLocation(`/session/${sessionId}/partie`)}>
              Jouer quelques duels
            </Button>
          </div>
        ) : (
          <>
            {/* ── 1. Ordination ────────────────────────────────────────────── */}
            <section className="space-y-4">
              <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" aria-hidden="true" />
                Ordination actuelle
              </h2>
              <p className="text-sm text-muted-foreground">
                Une estimation, calculée à partir de tes comparaisons deux à
                deux — elle tient compte de la force de ce que chaque valeur a
                rencontré. La barre pâle dit ce qu'on ne sait pas encore.
              </p>
              <ol className="grid gap-2">
                {ordination.map((ligne) => (
                  <LigneClassement key={ligne.valeur} ligne={ligne} />
                ))}
              </ol>
              {inexplorees.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Pas encore mises à l'épreuve :{" "}
                  {inexplorees.map((l) => l.valeur).join(", ")}.
                </p>
              )}
            </section>

            {/* ── 2 à 4. Les trois lectures de valeurs ─────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
              <Bloc
                titre="Particulièrement fortes"
                sousTitre="Prioritaires dans plusieurs situations différentes."
                icone={<Sparkles className="w-5 h-5 text-primary" />}
                vide="Aucune valeur ne s'est encore imposée dans plus d'un contexte."
              >
                {valeursFortes.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </Bloc>
              <Bloc
                titre="Contextuelles"
                sousTitre="Importantes seulement dans certaines situations."
                icone={<MapPin className="w-5 h-5 text-accent" />}
                vide="Rien qui dépende visiblement de la situation, jusqu'ici."
              >
                {valeursContextuelles.map((v) => (
                  <li key={v.valeur} title={v.texte}>
                    {v.valeur}
                  </li>
                ))}
              </Bloc>
              <Bloc
                titre="Actuellement protégées"
                sousTitre="Aucun compromis observé à ce jour."
                icone={<ShieldCheck className="w-5 h-5 text-secondary" />}
                vide="Toutes tes valeurs ont déjà été secondaires au moins une fois."
              >
                {valeursProtegees.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </Bloc>
            </div>

            {/* ── 5. Tensions principales ──────────────────────────────────── */}
            {tensionsPrincipales.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-primary" aria-hidden="true" />
                  Principales tensions
                </h2>
                <div className="grid gap-3">
                  {tensionsPrincipales.map((t) => (
                    <div
                      key={`${t.valeurA}|${t.valeurB}`}
                      className="rounded-xl border border-border/60 bg-card p-4"
                    >
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t.valeurA} · {t.valeurB}
                      </p>
                      <p className="mt-2 leading-relaxed">{t.texte}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── 6. Points de bascule ─────────────────────────────────────── */}
            {(dimensionsSensibles.length > 0 || bascules.length > 0) && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <SlidersHorizontal
                    className="w-5 h-5 text-accent"
                    aria-hidden="true"
                  />
                  Points de bascule
                </h2>
                {dimensionsSensibles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dimensionsSensibles.map((d) => (
                      <span
                        key={`${d.dimension}-${d.source}`}
                        className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-sm"
                      >
                        {d.libelle}
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          {d.source === "ca_depend"
                            ? "tu l'as nommé"
                            : "observé en situation"}
                          {d.occurrences > 1 && ` ×${d.occurrences}`}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  {bascules.map((b) => (
                    <div
                      key={b.serieId}
                      className="rounded-xl border border-accent/30 bg-accent/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {b.valeurA} · {b.valeurB} — on faisait monter{" "}
                        {libellesDimension[b.dimension as Dimension] ??
                          b.dimension}
                      </p>
                      <p className="mt-2">
                        {b.reglageBascule ? (
                          <>
                            Ta réponse a changé à :{" "}
                            <span className="font-medium">
                              {b.reglageBascule}
                            </span>
                            .
                          </>
                        ) : (
                          <>
                            Ta réponse n'a pas bougé, même au dernier cran. Si un
                            point de bascule existe, il est plus loin que ce que
                            le jeu est allé.
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Boucles ──────────────────────────────────────────────────── */}
            {cycles.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-serif font-semibold">
                  Ça tourne en rond
                </h2>
                <p className="text-sm text-muted-foreground">
                  Trois valeurs peuvent se battre en boucle sans qu'aucune ne
                  gagne. Ce n'est pas une erreur de ta part : ça veut dire que la
                  situation décide, pas un ordre fixe.
                </p>
                <ul className="grid gap-2">
                  {cycles.map((cycle) => (
                    <li
                      key={cycle.join("|")}
                      className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm"
                    >
                      {cycle.join(" → ")} → {cycle[0]}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── 7. Ce que le jeu a compté ────────────────────────────────── */}
            <section className="space-y-4">
              <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" aria-hidden="true" />
                Ce que le jeu a compté
              </h2>
              <div className="grid gap-3">
                {observations.map((obs) => (
                  <Observation
                    key={obs.id}
                    obs={obs}
                    reponses={(obs.reponsesSources ?? [])
                      .map((id) => parId.get(id))
                      .filter((r): r is ReponseCollision => r !== undefined)}
                    duelsCartes={duelsCartesParId}
                  />
                ))}
              </div>
            </section>

            {/* ── Couverture ───────────────────────────────────────────────── */}
            {couverture && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tuile
                  valeur={`${couverture.pairesCouvertes}/${couverture.pairesPertinentes}`}
                  label="paires de valeurs confrontées"
                />
                <Tuile
                  valeur={String(couverture.comparaisonsRetenues)}
                  label="comparaisons retenues"
                />
                <Tuile
                  valeur={String(couverture.manifestationsRejouees)}
                  label="tensions revues autrement"
                />
                <Tuile
                  valeur={`${Math.round((constellation.stabilite ?? 1) * 100)} %`}
                  label="même réponse en la rejouant"
                />
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Ce que ça ne dit pas</p>
              <p>
                Rien ici ne prédit ce que tu ferais pour vrai. Une situation
                jouée sur un écran ne coûte rien ; une vraie, oui. L'ordre
                ci-dessus est une estimation à partir de{" "}
                {couverture?.comparaisonsRetenues ?? 0} comparaisons — pas un
                classement de tes valeurs.
              </p>
            </div>
          </>
        )}

        {/* ── Mettre à l'épreuve ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3 text-center">
          <h2 className="text-2xl font-serif font-semibold">
            Mettre ma constellation à l'épreuve
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Le jeu choisit maintenant les comparaisons qui apprendraient
            quelque chose : deux valeurs au coude à coude, une paire où ta
            réponse a changé, une valeur qui n'a encore jamais cédé.
            {(progres?.peutAffiner ?? false) && (
              <>
                {" "}
                Les paires jamais confrontées y passent aussi — il en reste{" "}
                {(progres?.pairesPertinentes ?? 0) -
                  (progres?.pairesCouvertes ?? 0)}
                .
              </>
            )}
          </p>
          <Button
            size="lg"
            onClick={mettreALepreuve}
            disabled={majSession.isPending}
          >
            <Sparkles className="size-4 mr-2" />
            {(progres?.tensionsRestantes ?? 0) > 0
              ? "Continuer avec les tensions utiles"
              : "Affiner ma constellation"}
          </Button>
        </section>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation(`/session/${sessionId}/comparer`)}
          >
            <Users className="size-4 mr-2" /> Comparer avec quelqu'un
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setLocation(`/session/${sessionId}/cartes`)}
          >
            Changer mes cartes
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function LigneClassement({ ligne }: { ligne: LigneOrdination }) {
  // Les forces sont en échelle logarithmique, centrées sur 0. On les ramène sur
  // une largeur lisible sans prétendre à une échelle absolue.
  const position = (f: number) =>
    Math.min(100, Math.max(0, ((f + 2) / 4) * 100));
  const bas = position(ligne.intervalleBas);
  const haut = position(ligne.intervalleHaut);

  return (
    <li className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground tabular-nums shrink-0">
          {ligne.rang}.
        </span>
        <span className="font-medium flex-1 min-w-32">{ligne.valeur}</span>
        <span
          className={`text-xs rounded-full border px-2 py-0.5 ${tonConfiance[ligne.niveauConfiance as NiveauConfiance]}`}
        >
          {libellesConfiance[ligne.niveauConfiance as NiveauConfiance]}
        </span>
      </div>

      <div
        className="relative h-2 mt-3 rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`Force estimée, fourchette de ${Math.round(bas)} à ${Math.round(haut)} sur 100`}
      >
        <span
          className="absolute inset-y-0 bg-primary/25"
          style={{ left: `${bas}%`, width: `${Math.max(2, haut - bas)}%` }}
        />
        <span
          className="absolute inset-y-0 w-1 bg-primary rounded-full"
          style={{ left: `${position(ligne.force)}%` }}
        />
      </div>

      <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
        {ligne.prioritaireSur.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0">{termes.colonnePrioritaire} :</dt>
            <dd>{ligne.prioritaireSur.join(", ")}</dd>
          </div>
        )}
        {ligne.secondaireFaceA.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0">{termes.colonneSecondaire} :</dt>
            <dd>{ligne.secondaireFaceA.join(", ")}</dd>
          </div>
        )}
        {ligne.contextes.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0">Surtout :</dt>
            <dd>
              {ligne.contextes
                .map((c) => libellesContexte[c as Contexte] ?? c)
                .join(", ")
                .toLowerCase()}
            </dd>
          </div>
        )}
        {ligne.indecis > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0">Non tranché :</dt>
            <dd>
              {ligne.indecis} fois sur {ligne.comparaisons + ligne.indecis}
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}

function Bloc({
  titre,
  sousTitre,
  icone,
  vide,
  children,
}: {
  titre: string;
  sousTitre: string;
  icone: React.ReactNode;
  vide: string;
  children: React.ReactNode;
}) {
  const liste = Array.isArray(children) ? children : [children];
  const rempli = liste.filter(Boolean).length > 0;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
      <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
        {icone}
        {titre}
      </h2>
      <p className="text-xs text-muted-foreground">{sousTitre}</p>
      {rempli ? (
        <ul className="text-sm space-y-1 pt-1">{children}</ul>
      ) : (
        <p className="text-sm text-muted-foreground/80 pt-1">{vide}</p>
      )}
    </section>
  );
}

function Tuile({ valeur, label }: { valeur: string; label: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
      <div className="text-2xl font-serif font-bold text-primary">{valeur}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Observation({
  obs,
  reponses,
  duelsCartes,
}: {
  obs: ObservationConstellation;
  reponses: ReponseCollision[];
  duelsCartes: Map<number, DuelCarteContenu>;
}) {
  const rubrique = rubriques[obs.type] ?? {
    titre: "Observation",
    ton: "border-border bg-card",
  };
  const sources = reponses
    .map((r) => ({ id: r.id, detail: decrireReponse(r, duelsCartes) }))
    .filter(
      (s): s is { id: number; detail: { situation: string; choix: string } } =>
        s.detail !== null,
    );

  return (
    <div className={`rounded-xl border p-4 ${rubrique.ton}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {rubrique.titre}
      </p>
      <p className="leading-relaxed">{obs.texte}</p>

      {sources.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none underline underline-offset-4 decoration-dotted">
            D'où ça sort ?
          </summary>
          <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
            {sources.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="text-muted-foreground">{s.detail.situation}</p>
                <p className="font-medium mt-1">→ {s.detail.choix}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
