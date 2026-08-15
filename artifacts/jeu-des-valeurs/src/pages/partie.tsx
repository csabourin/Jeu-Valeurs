import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { BlocArbitrage } from "@/components/bloc-arbitrage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  useGetProgres,
  getGetProgresQueryKey,
  useCreateReponse,
  useUpdateSession,
  type Question,
  type ReponseCollisionInputChoix,
  type SessionUpdateEtapeCourante,
} from "@workspace/api-client-react";
import { libellesContexte, libellesDimension } from "@workspace/contenu";
import type { Contexte, Dimension } from "@workspace/contenu";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoveRight, Loader2, SlidersHorizontal, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** Toutes les N réponses tranchées, on demande ce que la personne protégeait. */
const CADENCE_QUESTION_PROTEGEE = 4;

/**
 * L'étape à enregistrer pour chaque phase calculée. `termine` n'y est pas :
 * c'est le bouton « Voir ma carte » qui fait passer à la constellation, pas le
 * simple fait d'avoir répondu à tout.
 */
const etapeParPhase: Record<string, SessionUpdateEtapeCourante | undefined> = {
  arbitrages: "arbitrages",
  duels: "collisions",
  bascules: "bascules",
};

const facteurs: { id: string; label: string }[] = [
  { id: "ampleur_impact", label: "La gravité" },
  { id: "cout_personnel", label: "Ce que ça me coûte" },
  { id: "proximite_sociale", label: "Qui est la personne" },
  { id: "nombre_personnes", label: "Combien de gens" },
  { id: "certitude", label: "Si j'en suis sûr" },
  { id: "reversibilite", label: "Si c'est réparable" },
  { id: "urgence", label: "Le temps que j'ai" },
  { id: "responsabilite", label: "Ma part de responsabilité" },
  { id: "autre", label: "Autre chose" },
];

type Etape = "choix" | "depend" | "reglages";

export default function Partie() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: progres, isLoading } = useGetProgres(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetProgresQueryKey(sessionId),
      refetchOnWindowFocus: false,
    },
  });

  const creerReponse = useCreateReponse();
  const majSession = useUpdateSession();
  const { toast } = useToast();

  const [etape, setEtape] = useState<Etape>("choix");
  const [choix, setChoix] = useState<ReponseCollisionInputChoix | null>(null);
  const [facteur, setFacteur] = useState<string>("");
  const [facteurLibre, setFacteurLibre] = useState("");
  const [difficulte, setDifficulte] = useState(3);
  const [certitude, setCertitude] = useState(3);
  const [valeurProtegee, setValeurProtegee] = useState<string | null>(null);
  // Verrou local : la mutation est finie bien avant que la question suivante
  // soit revenue du serveur. Sans lui, on peut répondre deux fois au même duel.
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const question = progres?.prochaineQuestion ?? null;

  // Chaque nouvelle question repart à neuf.
  useEffect(() => {
    setEtape("choix");
    setChoix(null);
    setFacteur("");
    setFacteurLibre("");
    setDifficulte(3);
    setCertitude(3);
    setValeurProtegee(null);
    setEnvoiEnCours(false);
  }, [question?.dilemmeId]);

  // L'étape enregistrée sert à reprendre la partie au bon endroit après une
  // fermeture d'onglet. La phase, elle, se recalcule depuis les réponses : on
  // aligne l'une sur l'autre à chaque changement de phase. Le `ref` retient ce
  // qui a déjà été annoncé pour ne pas repatcher à chaque rafraîchissement.
  const etapeAnnoncee = useRef<string | null>(null);
  useEffect(() => {
    if (!progres) return;
    const attendue = etapeParPhase[progres.phase];
    if (!attendue) return;
    if (progres.etapeCourante === attendue) return;
    if (etapeAnnoncee.current === attendue) return;
    etapeAnnoncee.current = attendue;
    majSession.mutate({ sessionId, data: { etapeCourante: attendue } });
  }, [progres, sessionId, majSession]);

  // La question « qu'est-ce que tu protégeais ? » revient de temps en temps.
  // Posée à chaque fois, elle transformerait la partie en interrogatoire.
  const demanderValeurProtegee =
    question != null &&
    (progres?.nombreReponses ?? 0) % CADENCE_QUESTION_PROTEGEE === 0;

  const envoyer = (choixFinal: ReponseCollisionInputChoix) => {
    if (!question || envoiEnCours) return;
    const passe = choixFinal === "passer";
    setEnvoiEnCours(true);

    creerReponse.mutate(
      {
        sessionId,
        data: {
          dilemmeId: question.dilemmeId,
          valeurA: question.valeurA,
          valeurB: question.valeurB,
          choix: choixFinal,
          facteurDepend: choixFinal === "ca_depend" ? facteur : null,
          facteurDependLibre: facteur === "autre" ? facteurLibre : null,
          difficulte: passe ? null : difficulte,
          certitude: passe ? null : certitude,
          serieId: question.serieId ?? null,
          palier: question.palier ?? null,
          dimension: question.dimension ?? null,
          valeurProtegee: passe ? null : valeurProtegee,
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
            title: "Réponse pas enregistrée",
            description: "La connexion a flanché. Réessaie — rien n'est perdu.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const choisir = (c: ReponseCollisionInputChoix) => {
    setChoix(c);
    if (c === "passer") envoyer(c);
    else if (c === "ca_depend") setEtape("depend");
    else setEtape("reglages");
  };

  const terminer = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "constellation" } },
      {
        onSuccess: () => setLocation(`/session/${sessionId}/constellation`),
        onError: (erreur) =>
          toast({
            title: "Impossible d'afficher ta carte",
            description: erreur.message,
            variant: "destructive",
          }),
      },
    );
  };

  if (isLoading) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  // Les arbitrages passent avant les duels : on classe ses cartes à froid,
  // avant que la moindre situation ait pu déplacer l'ordre.
  if (progres?.phase === "arbitrages" && progres.prochainBloc) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <BlocArbitrage
          sessionId={sessionId}
          bloc={progres.prochainBloc}
          repondus={progres.arbitragesRepondus}
          planifies={progres.arbitragesPlanifies}
        />
      </Shell>
    );
  }

  if (progres && progres.duelsPlanifies === 0 && !question) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-serif font-bold">
            Pas encore de duel possible
          </h1>
          <p className="text-muted-foreground">
            Le jeu n'a pas trouvé de situation qui oppose deux de tes raisons.
            Reprends quelques cartes, ou coche d'autres raisons.
          </p>
          <Button onClick={() => setLocation(`/session/${sessionId}/cartes`)}>
            Retourner aux cartes
          </Button>
        </div>
      </Shell>
    );
  }

  if (!question) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto animate-in fade-in zoom-in duration-500">
          <h1 className="text-3xl font-serif font-bold">Manche terminée</h1>
          <p className="text-lg text-muted-foreground">
            Tu as joué {progres?.duelsRepondus ?? 0} duel
            {(progres?.duelsRepondus ?? 0) > 1 && "s"}
            {(progres?.seriesTerminees ?? 0) > 0 &&
              ` et ${progres?.seriesTerminees} série${(progres?.seriesTerminees ?? 0) > 1 ? "s" : ""} de bascule`}
            . Voyons ce que ça donne.
          </p>
          <Button size="lg" onClick={terminer} disabled={majSession.isPending}>
            Voir ma carte <MoveRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Shell>
    );
  }

  const estBascule = question.type === "bascule";
  const totalPrevu = (progres?.duelsPlanifies ?? 0) + (progres?.seriesPlanifiees ?? 0);
  const faits = (progres?.duelsRepondus ?? 0) + (progres?.seriesTerminees ?? 0);
  const avancement = totalPrevu > 0 ? (faits / totalPrevu) * 100 : 0;
  const enCours = creerReponse.isPending || envoiEnCours;

  return (
    <Shell sessionId={sessionId} etape="partie">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
            <span className="inline-flex items-center gap-2">
              {estBascule ? (
                <>
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> Bascule
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" aria-hidden="true" /> Duel
                </>
              )}
            </span>
            <span>
              {progres?.duelsRepondus} / {progres?.duelsPlanifies} duels
            </span>
          </div>
          <Progress value={Math.min(100, Math.max(0, avancement))} className="h-2" />
        </div>

        {etape === "choix" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
            <EnTeteQuestion question={question} />

            <div
              role="group"
              aria-label="Ton choix"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <OptionCarte
                texte={question.optionA}
                valeur={question.valeurA}
                onClick={() => choisir("A")}
                disabled={enCours}
              />
              <OptionCarte
                texte={question.optionB}
                valeur={question.valeurB}
                onClick={() => choisir("B")}
                disabled={enCours}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {/* Dans une bascule, le réglage est justement ce que le jeu
                  contrôle : « ça dépend » n'y a plus de sens. */}
              {!estBascule && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={enCours}
                  onClick={() => choisir("ca_depend")}
                >
                  Ça dépend
                </Button>
              )}
              <Button
                variant="outline"
                className="rounded-full"
                disabled={enCours}
                onClick={() => choisir("je_ne_sais_pas")}
              >
                Je ne sais pas
              </Button>
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                disabled={enCours}
                onClick={() => choisir("passer")}
              >
                Passer
              </Button>
            </div>
          </div>
        )}

        {etape === "depend" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold">
                Ça dépend de quoi ?
              </h2>
              <p className="text-muted-foreground">
                C'est une vraie réponse. Le jeu s'en sert pour te renvoyer la même
                situation avec ce réglage-là qui change.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {facteurs.map((f) => (
                <Button
                  key={f.id}
                  variant={facteur === f.id ? "default" : "outline"}
                  className="h-16 whitespace-normal text-center leading-tight"
                  onClick={() => setFacteur(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {facteur === "autre" && (
              <Input
                autoFocus
                value={facteurLibre}
                onChange={(e) => setFacteurLibre(e.target.value)}
                aria-label="Dis de quoi ça dépend"
                placeholder="Ça dépend de…"
                className="h-12 bg-card"
              />
            )}

            <div className="flex justify-center gap-3">
              <Button variant="ghost" onClick={() => setEtape("choix")}>
                Retour
              </Button>
              <Button
                size="lg"
                disabled={!facteur || (facteur === "autre" && !facteurLibre.trim())}
                onClick={() => setEtape("reglages")}
              >
                Continuer <MoveRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {etape === "reglages" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold">
                Deux petites questions
              </h2>
              <p className="text-muted-foreground">Puis on passe à la suivante.</p>
            </div>

            <div className="space-y-8 bg-card border border-border/50 rounded-2xl p-5 md:p-6">
              <Echelle
                label="C'était difficile à choisir ?"
                bas="Facile"
                haut="Déchirant"
                valeur={difficulte}
                onChange={setDifficulte}
              />
              <div className="pt-6 border-t border-border/40">
                <Echelle
                  label="Tu répondrais pareil demain ?"
                  bas="Aucune idée"
                  haut="Certain"
                  valeur={certitude}
                  onChange={setCertitude}
                />
              </div>

              {demanderValeurProtegee && choix !== "je_ne_sais_pas" && (
                <fieldset className="pt-6 border-t border-border/40 space-y-3">
                  <legend className="font-medium">
                    Qu'est-ce que tu essayais de protéger ?
                  </legend>
                  <p className="text-sm text-muted-foreground">
                    Le jeu ne le devine pas. Tu peux aussi sauter la question.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[question.valeurA, question.valeurB].map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={valeurProtegee === v}
                        onClick={() =>
                          setValeurProtegee(valeurProtegee === v ? null : v)
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          valeurProtegee === v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <Button
                variant="ghost"
                disabled={enCours}
                onClick={() => setEtape(choix === "ca_depend" ? "depend" : "choix")}
              >
                Retour
              </Button>
              <Button
                size="lg"
                className="min-w-[150px]"
                disabled={enCours || !choix}
                onClick={() => choix && envoyer(choix)}
              >
                {enCours ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "C'est mon choix"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/30 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={terminer}
            disabled={majSession.isPending}
            className="text-muted-foreground"
          >
            Arrêter ici et voir ma carte
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function EnTeteQuestion({ question }: { question: Question }) {
  if (question.type === "bascule") {
    const dimension =
      libellesDimension[question.dimension as Dimension] ?? "le réglage";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-accent font-medium">
            Même situation — on monte {dimension}
          </p>
          <p className="text-muted-foreground">{question.amorce}</p>
          {question.reglage && (
            <p className="font-medium">
              Cette fois : <span className="text-foreground">{question.reglage}</span>
            </p>
          )}
        </div>
        <p className="text-xl md:text-2xl font-serif leading-snug">
          {question.situation}
        </p>
      </div>
    );
  }

  const contexte = libellesContexte[question.contexte as Contexte];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {contexte && (
          <span className="bg-muted px-2 py-1 rounded-full">{contexte}</span>
        )}
        <span className="bg-muted px-2 py-1 rounded-full">
          {question.valeurA} contre {question.valeurB}
        </span>
        {question.estVariante && (
          <span className="bg-muted px-2 py-1 rounded-full">
            Déjà croisé, autrement
          </span>
        )}
      </div>
      <p className="text-xl md:text-2xl font-serif leading-snug">
        {question.situation}
      </p>
    </div>
  );
}

function OptionCarte({
  texte,
  valeur,
  onClick,
  disabled,
}: {
  texte: string;
  valeur: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left rounded-xl border border-border/60 bg-card p-6 min-h-[140px] flex flex-col justify-between gap-4 transition-all hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
    >
      <span className="text-lg md:text-xl font-medium leading-snug">{texte}</span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Tu protèges : {valeur}
      </span>
    </button>
  );
}

function Echelle({
  label,
  bas,
  haut,
  valeur,
  onChange,
}: {
  label: string;
  bas: string;
  haut: string;
  valeur: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">{label}</legend>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">{bas}</span>
        <div className="flex-1 flex justify-between gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={valeur === v}
              aria-label={`${v} sur 5`}
              onClick={() => onChange(v)}
              className={`w-10 h-10 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                valeur === v
                  ? "bg-primary text-primary-foreground scale-110 shadow-md"
                  : "bg-muted/50 text-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
          {haut}
        </span>
      </div>
    </fieldset>
  );
}
