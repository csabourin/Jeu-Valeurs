import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  useGetConstellation,
  getGetConstellationQueryKey,
  useListReponses,
  getListReponsesQueryKey,
  useListCartesSession,
  getListCartesSessionQueryKey,
  type ObservationConstellation,
  type ReponseCollision,
  type TendanceValeur,
} from "@workspace/api-client-react";
import { collisionsPossibles } from "@workspace/contenu";
import type { Collision } from "@workspace/contenu";
import { useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Swords,
  Compass,
  Scale,
  Users,
  Ban,
} from "lucide-react";

/** Icône et titre de section par type d'observation. */
const rubriques: Record<
  ObservationConstellation["type"],
  { titre: string; ton: string }
> = {
  limite_tenue: {
    titre: "N'a pas plié",
    ton: "border-secondary/30 bg-secondary/5",
  },
  tendance: {
    titre: "Ce qui est passé devant",
    ton: "border-primary/30 bg-primary/5",
  },
  point_de_bascule: {
    titre: "Point de bascule",
    ton: "border-accent/40 bg-accent/5",
  },
  tension: { titre: "Tension ouverte", ton: "border-border bg-card" },
  stabilite: {
    titre: "Même conflit, autre forme",
    ton: "border-border bg-card",
  },
  territoire_inexplore: {
    titre: "Pas encore exploré",
    ton: "border-border bg-muted/30",
  },
  couverture: { titre: "Ce que ça couvre", ton: "border-border bg-muted/30" },
  arbitrage: { titre: "Cartes en main", ton: "border-border bg-card" },
  ecart_declare: {
    titre: "Dit à froid, joué en situation",
    ton: "border-accent/40 bg-accent/5",
  },
};

/** Retrouve la situation jouée derrière une réponse, pour pouvoir la remontrer. */
function decrireReponse(
  r: ReponseCollision,
  collisions: Map<number, Collision>,
): { situation: string; choix: string } | null {
  if (r.dilemmeId == null) return null;
  const collision = collisions.get(r.dilemmeId);
  if (!collision) return null;

  return {
    situation: collision.situation,
    choix:
      r.choix === "A"
        ? collision.optionA
        : r.choix === "B"
          ? collision.optionB
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

  const { data: constellation, isLoading } = useGetConstellation(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetConstellationQueryKey(sessionId),
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

  const combatsPossibles = useMemo(
    () =>
      collisionsPossibles(
        (cartes ?? []).map((carte) => ({
          id: String(carte.id),
          famille: carte.famille,
          label: carte.label,
          valeurs: carte.valeursConfirmées,
        })),
      ),
    [cartes],
  );

  const combatsParId = useMemo(
    () => new Map(combatsPossibles.map((combat) => [combat.id, combat])),
    [combatsPossibles],
  );

  const parId = useMemo(() => {
    const index = new Map<number, ReponseCollision>();
    for (const r of reponses ?? []) index.set(r.id, r);
    return index;
  }, [reponses]);

  if (isLoading || !constellation) {
    return (
      <Shell sessionId={sessionId} etape="constellation">
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-serif">
            On relie tes choix…
          </p>
        </div>
      </Shell>
    );
  }

  const { tendances, bascules, observations, couverture, cartesJugees } =
    constellation;
  // Le contrat annonce `cartesJugees` comme obligatoire, et le serveur en
  // renvoie toujours un tableau — vide au pire. Mais le frontend est un paquet
  // statique et l'API un service à part : les deux ne se déploient pas au même
  // instant. Un serveur d'avant les arbitrages répond sans ce champ, et la page
  // entière tombait alors sur « Cannot read properties of undefined ». Un champ
  // récent se lit donc en supposant qu'il puisse manquer — la section disparaît,
  // le reste de la carte s'affiche.
  const classees = (cartesJugees ?? []).filter((c) => c.apparitions > 0);
  const misesALepreuve = tendances.filter((t) => !t.territoireInexplore);
  // Une limite qui n'a cédé devant aucun enjeu rencontré. Ce n'est pas une
  // vertu prouvée : seulement l'absence d'exception connue à ce jour.
  const tenues = bascules.filter((b) => b.jamaisFranchie);
  const bousculees = bascules.filter(
    (b) => b.tientDevant !== null && b.cedeDevant !== null,
  );
  const rien = misesALepreuve.length === 0;
  const reponseParDilemme = new Map(
    (reponses ?? [])
      .filter((reponse) => reponse.dilemmeId != null)
      .map((reponse) => [reponse.dilemmeId as number, reponse]),
  );
  const combatsJoues = combatsPossibles
    .map((combat) => ({
      combat,
      reponse: reponseParDilemme.get(combat.id),
    }))
    .filter(
      (
        entree,
      ): entree is {
        combat: Collision;
        reponse: ReponseCollision;
      } => entree.reponse !== undefined,
    );
  const combatsParLimite = new Map<
    string,
    { combat: Collision; reponse: ReponseCollision }[]
  >();
  for (const entree of combatsJoues) {
    const groupe = combatsParLimite.get(entree.combat.limiteId);
    if (groupe) groupe.push(entree);
    else combatsParLimite.set(entree.combat.limiteId, [entree]);
  }
  const groupesDecisifs = Array.from(combatsParLimite.values())
    .map((groupe) =>
      groupe.filter(
        (entree) =>
          entree.reponse.choix === "A" || entree.reponse.choix === "B",
      ),
    )
    .filter((groupe) => groupe.length > 0);
  const limitesFermes = groupesDecisifs.filter((groupe) =>
    groupe.every((entree) => entree.reponse.choix === "B"),
  );
  const limitesFranchies = groupesDecisifs.filter((groupe) =>
    groupe.some((entree) => entree.reponse.choix === "A"),
  );
  const basculesCartes = groupesDecisifs
    .map((groupe) => ({
      refuse: groupe.find((entree) => entree.reponse.choix === "B"),
      accepte: groupe.find((entree) => entree.reponse.choix === "A"),
    }))
    .filter(
      (
        bascule,
      ): bascule is {
        refuse: { combat: Collision; reponse: ReponseCollision };
        accepte: { combat: Collision; reponse: ReponseCollision };
      } => bascule.refuse !== undefined && bascule.accepte !== undefined,
    );

  return (
    <Shell sessionId={sessionId} etape="constellation">
      <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700">
        <header className="space-y-4 text-center max-w-2xl mx-auto">
          <p className="eyebrow mx-auto">Étape 4 · Découvrir</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Ce que tes choix révèlent
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Quelles limites ont tenu, lesquelles ont bougé, et ce qui avait
            assez de poids pour changer ta réponse. Ce portrait parle seulement
            des combats que tu viens de jouer.
          </p>
        </header>

        {rien && combatsJoues.length === 0 ? (
          <div className="text-center space-y-4 py-12">
            <p className="text-muted-foreground">
              Il n'y a pas encore assez de choix tranchés pour dessiner quoi que
              ce soit.
            </p>
            <Button onClick={() => setLocation(`/session/${sessionId}/partie`)}>
              Jouer quelques combats
            </Button>
          </div>
        ) : (
          <>
            {limitesFermes.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <ShieldCheck
                    className="w-5 h-5 text-secondary"
                    aria-hidden="true"
                  />
                  Tes limites qui ont tenu
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {limitesFermes.map((groupe) => (
                    <div
                      key={groupe[0].combat.limiteId}
                      className="rounded-xl border border-secondary/30 bg-secondary/5 p-4"
                    >
                      <p className="font-medium">
                        {groupe[0].combat.limiteLabel}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tu as dit non face à {groupe.length} enjeu
                        {groupe.length > 1 ? "x" : ""} différent
                        {groupe.length > 1 ? "s" : ""}. Jusqu'ici, cette limite
                        n'a pas bougé.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {limitesFranchies.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <Ban className="w-5 h-5 text-primary" aria-hidden="true" />
                  Ce qui pourrait te faire franchir une limite
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {limitesFranchies.map((groupe) => {
                    const oui = groupe.filter(
                      (entree) => entree.reponse.choix === "A",
                    );
                    return (
                      <div
                        key={groupe[0].combat.limiteId}
                        className="rounded-xl border border-primary/30 bg-primary/5 p-4"
                      >
                        <p className="font-medium">
                          {groupe[0].combat.limiteLabel}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tu as répondu oui pour{" "}
                          {oui
                            .map((entree) => formulerEnjeu(entree.combat))
                            .join(" · ")}
                          .
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {basculesCartes.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <SlidersHorizontal
                    className="w-5 h-5 text-accent"
                    aria-hidden="true"
                  />
                  Là où ta réponse bascule
                </h2>
                <div className="space-y-3">
                  {basculesCartes.map(({ refuse, accepte }) => (
                    <div
                      key={refuse.combat.limiteId}
                      className="rounded-xl border border-accent/30 bg-accent/5 p-4"
                    >
                      <p className="font-medium">{refuse.combat.limiteLabel}</p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Tu as refusé de franchir cette limite pour{" "}
                        {formulerEnjeu(refuse.combat)}, mais tu as répondu oui
                        pour {formulerEnjeu(accepte.combat)}.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tuile
                valeur={`${Math.round(couverture * 100)} %`}
                label="des situations prévues"
              />
              <Tuile
                valeur={String(combatsJoues.length)}
                label={pluriel(
                  combatsJoues.length,
                  "combat joué",
                  "combats joués",
                )}
              />
              <Tuile
                valeur={String(limitesFermes.length)}
                label={pluriel(
                  limitesFermes.length,
                  "limite restée ferme",
                  "limites restées fermes",
                )}
              />
              <Tuile
                valeur={String(basculesCartes.length + bousculees.length)}
                label={pluriel(
                  basculesCartes.length + bousculees.length,
                  "point de bascule",
                  "points de bascule",
                )}
              />
            </div>

            {tenues.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <ShieldCheck
                    className="w-5 h-5 text-secondary"
                    aria-hidden="true"
                  />
                  Ce qui n'a pas plié
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tenues.map((b) => (
                    <div
                      key={b.limiteId}
                      className="rounded-xl border border-secondary/30 bg-secondary/5 p-4"
                    >
                      <p className="font-medium">{b.limiteLabel}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Aucun des enjeux rencontrés ne t'a fait franchir cette
                        limite. Ça ne veut pas dire qu'elle ne céderait jamais —
                        seulement qu'aucune situation jouée ne l'a fait bouger.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {classees.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" aria-hidden="true" />
                  Tes cartes, mises côte à côte
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ça, c'est avant les situations — juste tes cartes les unes à
                  côté des autres. Ce n'est pas ce qui a tenu quand ça coûtait
                  quelque chose : c'est ce que tu disais compter, à froid.
                </p>
                <ol className="grid gap-2">
                  {classees.map((carte, rang) => (
                    <li
                      key={carte.carteId}
                      className="rounded-lg border border-border/60 bg-card p-3 flex items-baseline gap-3"
                    >
                      <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {rang + 1}.
                      </span>
                      <span className="flex-1 leading-snug">{carte.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {carte.foisMeilleure > 0 &&
                          `${carte.foisMeilleure}× devant`}
                        {carte.foisMeilleure > 0 && carte.foisPire > 0 && " · "}
                        {carte.foisPire > 0 && `${carte.foisPire}× derrière`}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {bousculees.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                  <SlidersHorizontal
                    className="w-5 h-5 text-accent"
                    aria-hidden="true"
                  />
                  Tes points de bascule
                </h2>
                <div className="space-y-3">
                  {bousculees.map((b) => (
                    <div
                      key={b.limiteId}
                      className="rounded-xl border border-accent/30 bg-accent/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {b.limiteLabel}
                      </p>
                      <p className="mt-2">
                        Tu tiens devant{" "}
                        <span className="font-medium">{b.tientDevant}</span>, et
                        tu cèdes devant{" "}
                        <span className="font-medium">{b.cedeDevant}</span>.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {b.ordreInverse
                          ? "L'enjeu devant lequel tu as cédé pèse pourtant moins lourd, ailleurs dans ta partie. Ce n'est pas une contradiction : quelque chose dans la situation, et pas seulement le poids de l'enjeu, a changé la priorité."
                          : "C'est entre les deux que passe ta limite."}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                    reponses={obs.reponsesSources
                      .map((id) => parId.get(id))
                      .filter((r): r is ReponseCollision => r !== undefined)}
                    collisions={combatsParId}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                <Swords
                  className="w-5 h-5 text-muted-foreground"
                  aria-hidden="true"
                />
                Le détail
              </h2>
              <div className="grid gap-2">
                {misesALepreuve.map((t) => (
                  <LigneTendance key={t.valeur} tendance={t} />
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">
                Ce que ça ne dit pas
              </p>
              <p>
                Rien ici ne prédit ce que tu ferais pour vrai. Une situation
                jouée sur un écran ne coûte rien ; une vraie, oui. Le jeu compte
                seulement ce que tu as choisi dans les situations qu'il t'a
                servies, et il en a servi peu.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Button
            size="lg"
            onClick={() => setLocation(`/session/${sessionId}/comparer`)}
          >
            <Users className="size-4 mr-2" /> Comparer avec quelqu'un
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation(`/session/${sessionId}/partie`)}
          >
            Continuer à jouer
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

function formulerEnjeu(combat: Collision): string {
  const label =
    combat.enjeuLabel.length > 0
      ? combat.enjeuLabel[0].toLocaleLowerCase("fr") +
        combat.enjeuLabel.slice(1)
      : combat.enjeuLabel;
  return combat.enjeuFamille === "tresors" ? `garder ${label}` : label;
}

/** En français, zéro et un prennent le singulier. */
function pluriel(n: number, singulier: string, plurielForme: string): string {
  return n <= 1 ? singulier : plurielForme;
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
  collisions,
}: {
  obs: ObservationConstellation;
  reponses: ReponseCollision[];
  collisions: Map<number, Collision>;
}) {
  const rubrique = rubriques[obs.type];
  const sources = reponses
    .map((r) => ({ id: r.id, detail: decrireReponse(r, collisions) }))
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

function LigneTendance({ tendance }: { tendance: TendanceValeur }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="font-medium">
          <span className="text-muted-foreground tabular-nums mr-2">
            {tendance.rang}.
          </span>
          {tendance.valeur}
        </span>
        <span className="text-sm text-muted-foreground">
          {tendance.foisPrivilegiee} fois devant · {tendance.foisCedee} fois
          derrière
          {tendance.incertitudes > 0 &&
            ` · ${tendance.incertitudes} non tranchée${tendance.incertitudes > 1 ? "s" : ""}`}
        </span>
      </div>
      {tendance.territoireInexplore && (
        <p className="mt-2 text-sm text-muted-foreground">
          Cette valeur n'a encore rencontré aucune situation. Sa place reste à
          découvrir.
        </p>
      )}
    </div>
  );
}
