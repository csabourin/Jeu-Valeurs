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

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoveRight, Loader2, Swords, Sparkles } from "lucide-react";
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
  // `portrait` n'y est pas : c'est la personne qui décide de passer à
  // l'approfondissement, et c'est ce clic qui enregistre « bascules ». Le noter
  // ici sauterait la porte.
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
    // La première passe reste légère : la question, quatre réponses, rien
    // d'autre. Difficulté et certitude n'arrivent qu'à l'approfondissement.
    const detaille = question.approfondissement && !passe;
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
          difficulte: detaille ? difficulte : null,
          certitude: detaille ? certitude : null,
          valeurProtegee: detaille ? valeurProtegee : null,
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
    else if (question?.approfondissement) setEtape("reglages");
    // Première vague : on enchaîne. Les questions de réglage cassent le rythme
    // quand elles suivent chaque collision.
    else envoyer(c);
  };

  /** Après « ça dépend », on ne pousse vers les réglages qu'en approfondissement. */
  const apresFacteur = () => {
    if (question?.approfondissement) setEtape("reglages");
    else envoyer("ca_depend");
  };

  const approfondir = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "bascules" } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getGetProgresQueryKey(sessionId),
          }),
        onError: (erreur) =>
          toast({
            title: "Impossible de continuer",
            description: erreur.message,
            variant: "destructive",
          }),
      },
    );
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
            Pas encore de combat possible
          </h1>
          <p className="text-muted-foreground">
            Choisis au moins une limite et une aspiration ou un essentiel pour
            que le jeu puisse les mettre face à face.
          </p>
          <Button onClick={() => setLocation(`/session/${sessionId}/cartes`)}>
            Retourner aux cartes
          </Button>
        </div>
      </Shell>
    );
  }

  // Le portrait : la personne voit ce que ses premiers choix dessinent, puis
  // décide si elle veut le mettre à l'épreuve. Ce n'est pas une fin d'écran,
  // c'est une porte — et c'est ce qui change la nature de la deuxième passe.
  if (progres?.phase === "portrait") {
    const restantes =
      (progres.collisionsPossibles ?? 0) - (progres.collisionsRepondues ?? 0);

    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="max-w-2xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
          <header className="text-center space-y-3">
            <p className="eyebrow">Première constellation</p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold">
              Voici ce que tes premiers choix semblent montrer
            </h1>
            <p className="text-muted-foreground">
              Rien n'est figé : c'est ce qui est ressorti des situations que tu
              viens de jouer, pas un verdict sur toi.
            </p>
          </header>

          <ol className="space-y-2">
            {(progres.classement ?? []).slice(0, 8).map((rang) => (
              <li
                key={rang.valeur}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                  {rang.rang}
                </span>
                <span className="flex-1 font-medium">{rang.valeur}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {rang.gagnees}/{rang.confrontations} fois devant
                </span>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3 text-center">
            <p className="font-medium">Maintenant, mettons-la à l'épreuve.</p>
            <p className="text-sm text-muted-foreground">
              {restantes} situation{restantes > 1 ? "s" : ""} peuvent encore
              être jouées. Le jeu ira chercher celles qui en apprennent le plus.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={approfondir}
                disabled={majSession.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Mettre à l'épreuve
              </Button>
              <Button
                variant="ghost"
                onClick={terminer}
                disabled={majSession.isPending}
              >
                M'en tenir là
              </Button>
            </div>
          </div>
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
            Tu as joué {progres?.collisionsRepondues ?? 0} situation
            {(progres?.collisionsRepondues ?? 0) > 1 && "s"}. Voyons ce que ça
            donne.
          </p>
          <Button size="lg" onClick={terminer} disabled={majSession.isPending}>
            Voir ma carte <MoveRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Shell>
    );
  }

  // Pendant la première vague, la barre mesure le chemin jusqu'au portrait ;
  // ensuite, ce qu'il reste de collisions possibles.
  const enApprofondissement = question.approfondissement;
  const totalPrevu = enApprofondissement
    ? (progres?.collisionsPossibles ?? 0)
    : (progres?.duelsPlanifies ?? 0);
  const faits = enApprofondissement
    ? (progres?.collisionsRepondues ?? 0)
    : (progres?.duelsRepondus ?? 0);
  const avancement = totalPrevu > 0 ? (faits / totalPrevu) * 100 : 0;
  const enCours = creerReponse.isPending || envoiEnCours;

  return (
    <Shell sessionId={sessionId} etape="partie">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
            <span className="inline-flex items-center gap-2">
              {enApprofondissement ? (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> À
                  l'épreuve
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" aria-hidden="true" /> Collision
                </>
              )}
            </span>
            <span>
              {faits} / {totalPrevu} situations
            </span>
          </div>
          <Progress
            value={Math.min(100, Math.max(0, avancement))}
            className="h-2"
          />
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
              <Button
                variant="outline"
                className="rounded-full"
                disabled={enCours}
                onClick={() => choisir("ca_depend")}
              >
                Ça dépend
              </Button>
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
                C'est une vraie réponse. Le jeu s'en sert pour te renvoyer la
                même situation avec ce réglage-là qui change.
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
                disabled={
                  !facteur || (facteur === "autre" && !facteurLibre.trim())
                }
                onClick={apresFacteur}
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
              <p className="text-muted-foreground">
                Puis on passe à la suivante.
              </p>
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
                onClick={() =>
                  setEtape(choix === "ca_depend" ? "depend" : "choix")
                }
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
  // Une aspiration s'obtient, un essentiel se garde. La nuance change ce que la
  // question met en balance, donc elle est dite à l'écran.
  const roleEnjeu =
    question.enjeuFamille === "tresors"
      ? "Ce que tu voudrais garder"
      : "Ce que tu voudrais atteindre";

  return (
    <div className="space-y-4">
      {question.estReprise && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-accent font-medium">
            On y revient autrement
          </p>
          <p className="text-muted-foreground">
            Même tension, autre situation. Regarde si ta réponse tient.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Ta limite
          </p>
          <p className="font-medium mt-1">{question.limiteLabel}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {roleEnjeu}
          </p>
          <p className="font-medium mt-1">{question.enjeuLabel}</p>
        </div>
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
      <span className="text-lg md:text-xl font-medium leading-snug">
        {texte}
      </span>
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
        <span className="text-xs text-muted-foreground w-16 shrink-0">
          {bas}
        </span>
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
