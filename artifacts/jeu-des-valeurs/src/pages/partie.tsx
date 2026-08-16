import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  MoveRight,
  Loader2,
  SlidersHorizontal,
  Swords,
  Compass,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * L'étape à enregistrer pour chaque phase calculée.
 *
 * `termine` n'y est pas : c'est un bouton qui fait passer au portrait, jamais
 * le simple fait d'avoir répondu à tout. Et `epreuve` non plus — la mise à
 * l'épreuve se demande depuis le portrait, elle ne s'attrape pas en jouant.
 */
const etapeParPhase: Record<string, SessionUpdateEtapeCourante | undefined> = {
  ordination: "ordination",
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

type Etape = "choix" | "depend" | "approfondir";

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
  const [valeurProtegee, setValeurProtegee] = useState<string | null>(null);
  const [ceQuiChangerait, setCeQuiChangerait] = useState("");
  // Verrou local : la mutation est finie bien avant que la question suivante
  // soit revenue du serveur. Sans lui, on peut répondre deux fois au même duel.
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const question = progres?.prochaineQuestion ?? null;
  const enEpreuve = progres?.phase === "epreuve";

  // Chaque nouvelle question repart à neuf.
  useEffect(() => {
    setEtape("choix");
    setChoix(null);
    setFacteur("");
    setFacteurLibre("");
    setDifficulte(3);
    setValeurProtegee(null);
    setCeQuiChangerait("");
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

  const envoyer = (choixFinal: ReponseCollisionInputChoix) => {
    if (!question || envoiEnCours) return;
    const passe = choixFinal === "passer";
    // Les questions de relance n'existent qu'en mise à l'épreuve. Pendant la
    // première passe, on n'envoie rien de plus que le choix : c'est ce qui la
    // garde rapide.
    const approfondie = question.approfondir === true && !passe;
    setEnvoiEnCours(true);

    creerReponse.mutate(
      {
        sessionId,
        data: {
          dilemmeId: question.dilemmeId,
          valeurA: question.valeurA,
          valeurB: question.valeurB,
          carteA: question.carteA ?? null,
          carteB: question.carteB ?? null,
          contexte: question.contexte ?? null,
          phase: question.phase,
          choix: choixFinal,
          facteurDepend: choixFinal === "ca_depend" ? facteur : null,
          facteurDependLibre: facteur === "autre" ? facteurLibre : null,
          difficulte: approfondie ? difficulte : null,
          valeurProtegee: approfondie ? valeurProtegee : null,
          ceQuiChangerait:
            approfondie && ceQuiChangerait.trim().length > 0
              ? ceQuiChangerait.trim()
              : null,
          serieId: question.serieId ?? null,
          palier: question.palier ?? null,
          dimension: question.dimension ?? null,
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
    if (c === "passer") {
      envoyer(c);
      return;
    }
    if (c === "ca_depend") {
      setEtape("depend");
      return;
    }
    // Première passe : le choix est la réponse complète.
    if (!question?.approfondir) {
      envoyer(c);
      return;
    }
    setEtape("approfondir");
  };

  const versLeportrait = () => {
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

  // Le frontend est un paquet statique, l'API un service à part : les deux ne
  // se déploient pas au même instant. Un compteur **absent** n'est pas un
  // compteur à zéro — les confondre fait afficher « 0 paire de valeurs sur 0 »
  // avec aplomb, sur l'écran de fin, alors que la partie n'a jamais commencé.
  // On préfère le dire.
  const compteurs = progres as Partial<typeof progres> | undefined;
  const apiDepassee =
    compteurs !== undefined &&
    compteurs.comparaisonsPlanifiees === undefined &&
    compteurs.pairesPertinentes === undefined;

  if (apiDepassee) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-serif font-bold">
            L'écran et le serveur ne parlent pas la même version
          </h1>
          <p className="text-muted-foreground">
            L'API ne renvoie pas les compteurs que cette page attend. Ta partie
            n'est pas perdue — c'est le serveur qui n'a pas encore été redémarré
            avec la version courante.
          </p>
          <p className="text-sm text-muted-foreground">
            Relance l'API, puis recharge cette page.
          </p>
        </div>
      </Shell>
    );
  }

  if (progres && progres.comparaisonsPlanifiees === 0 && !question) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-serif font-bold">
            Pas encore de duel possible
          </h1>
          <p className="text-muted-foreground">
            Il faut au moins deux cartes qui protègent des valeurs différentes.
            Deux cartes qui disent la même chose ne se départagent pas.
          </p>
          <Button onClick={() => setLocation(`/session/${sessionId}/valeurs`)}>
            Revoir ce que mes cartes protègent
          </Button>
        </div>
      </Shell>
    );
  }

  if (!question) {
    return (
      <Shell sessionId={sessionId} etape="partie">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto animate-in fade-in zoom-in duration-500">
          <p className="eyebrow mx-auto">
            {enEpreuve
              ? "Mise à l'épreuve terminée"
              : "Première passe terminée"}
          </p>
          <h1 className="text-3xl font-serif font-bold">
            {enEpreuve
              ? "On a fait le tour, pour l'instant"
              : "Assez pour un premier portrait"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {progres?.comparaisonsRepondues ?? 0} comparaison
            {(progres?.comparaisonsRepondues ?? 0) > 1 ? "s" : ""} jouée
            {(progres?.comparaisonsRepondues ?? 0) > 1 ? "s" : ""} ·{" "}
            {progres?.pairesCouvertes ?? 0} paire
            {(progres?.pairesCouvertes ?? 0) > 1 ? "s" : ""} de valeurs sur{" "}
            {progres?.pairesPertinentes ?? 0}. Le portrait ne parlera que de
            celles-là — et il se précisera si tu continues.
          </p>
          <Button
            size="lg"
            onClick={versLeportrait}
            disabled={majSession.isPending}
          >
            Voir ma constellation <MoveRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Shell>
    );
  }

  const totalPrevu = enEpreuve
    ? (progres?.comparaisonsRepondues ?? 0) + (progres?.tensionsRestantes ?? 0)
    : (progres?.comparaisonsPlanifiees ?? 0);
  const faits = enEpreuve
    ? (progres?.comparaisonsRepondues ?? 0)
    : (progres?.comparaisonsRepondues ?? 0);
  const avancement = totalPrevu > 0 ? (faits / totalPrevu) * 100 : 0;
  const enCours = creerReponse.isPending || envoiEnCours;
  const estBascule = question.type === "bascule";

  return (
    <Shell sessionId={sessionId} etape="partie">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
            <span className="inline-flex items-center gap-2">
              {estBascule ? (
                <>
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />{" "}
                  Point de bascule
                </>
              ) : enEpreuve ? (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Mise à
                  l'épreuve
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" aria-hidden="true" /> Duel
                </>
              )}
            </span>
            <span>
              {progres?.pairesCouvertes} / {progres?.pairesPertinentes} paires
              de valeurs
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
                carte={question.carteALabel ?? null}
                onClick={() => choisir("A")}
                disabled={enCours}
              />
              <OptionCarte
                texte={question.optionB}
                valeur={question.valeurB}
                carte={question.carteBLabel ?? null}
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
                C'est une vraie réponse. Le jeu s'en sert pour te renvoyer la
                même tension avec ce réglage-là qui change.
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
                  enCours ||
                  !facteur ||
                  (facteur === "autre" && !facteurLibre.trim())
                }
                onClick={() =>
                  question.approfondir
                    ? setEtape("approfondir")
                    : envoyer("ca_depend")
                }
              >
                Continuer <MoveRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {etape === "approfondir" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold">
                Deux questions, si tu veux
              </h2>
              <p className="text-muted-foreground">
                Tu peux tout sauter : ce qui compte, c'est le choix que tu viens
                de faire.
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

              {choix !== "je_ne_sais_pas" && (
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

              <div className="pt-6 border-t border-border/40 space-y-3">
                <label
                  htmlFor="ce-qui-changerait"
                  className="font-medium block"
                >
                  Qu'est-ce qui aurait pu changer ta réponse ?
                </label>
                <p className="text-sm text-muted-foreground">
                  Dans tes mots. Rien n'est interprété à ta place.
                </p>
                <Textarea
                  id="ce-qui-changerait"
                  value={ceQuiChangerait}
                  onChange={(e) => setCeQuiChangerait(e.target.value)}
                  placeholder="Si ça avait été…"
                  className="bg-background min-h-20"
                />
              </div>
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
                  "Continuer"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/30 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={versLeportrait}
            disabled={majSession.isPending}
            className="text-muted-foreground"
          >
            <Compass className="size-4 mr-2" />
            Arrêter ici et voir ma constellation
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
              Cette fois :{" "}
              <span className="text-foreground">{question.reglage}</span>
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
      {question.motifTexte && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-accent font-medium">
            Pourquoi cette question maintenant
          </p>
          <p className="text-muted-foreground">{question.motifTexte}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {contexte && (
          <span className="bg-muted px-2 py-1 rounded-full">{contexte}</span>
        )}
        <span className="bg-muted px-2 py-1 rounded-full">
          {question.valeurA} · {question.valeurB}
        </span>
        {question.estVariante && (
          <span className="bg-muted px-2 py-1 rounded-full">
            Même tension, autre forme
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
  carte,
  onClick,
  disabled,
}: {
  texte: string;
  valeur: string;
  carte: string | null;
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
        {/* Formulation neutre : l'énoncé peut être au « je », l'étiquette ne
            doit pas repasser au « tu ». */}
        Ce que ça protège : {valeur}
        {carte && texte !== carte && (
          <span className="block normal-case tracking-normal mt-1 opacity-80">
            {carte}
          </span>
        )}
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
