import { useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  useCreateSession,
  useGetSession,
  getGetSessionQueryKey,
  type SessionEtapeCourante,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  Ban,
  Check,
  Compass,
  Heart,
  Play,
  Scale,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const chemins: Record<SessionEtapeCourante, string> = {
  accueil: "cartes",
  selection_cartes: "cartes",
  confirmation_valeurs: "valeurs",
  arbitrages: "partie",
  collisions: "partie",
  bascules: "partie",
  constellation: "constellation",
};

const reperes = [
  {
    titre: "Mes limites",
    phrase: "Ce que je refuse de faire",
    detail: "Les gestes et compromis qui iraient trop loin pour moi.",
    icon: Ban,
    ton: "repere-limites",
  },
  {
    titre: "Mes aspirations",
    phrase: "Ce vers quoi je veux aller",
    detail: "Ce que je veux vivre, construire, apprendre ou devenir.",
    icon: Target,
    ton: "repere-aspirations",
  },
  {
    titre: "Mes essentiels",
    phrase: "Ce que je veux préserver",
    detail: "Ce que j'ai déjà dans ma vie et que je ne veux pas perdre.",
    icon: Heart,
    ton: "repere-essentiels",
  },
];

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
      <div className="space-y-20 md:space-y-28 pb-8">
        <section className="hero-grid min-h-[650px] items-center py-8 md:py-14">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="eyebrow">
              <Sparkles className="size-4" aria-hidden="true" />
              Un jeu pour mieux te connaître
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-serif font-semibold leading-[0.98] text-balance">
                Ce qui compte pour toi,
                <span className="block text-primary italic mt-2">
                  quand il faut choisir.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed text-balance">
                Les valeurs sont faciles à nommer. Ce jeu les met en situation
                pour révéler tes priorités, tes hésitations et tes points de
                bascule — sans bonne ou mauvaise réponse.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {session ? (
                <>
                  <Button
                    size="lg"
                    onClick={reprendre}
                    className="cta-principal"
                  >
                    Reprendre mon parcours{" "}
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={commencer}
                    disabled={creerSession.isPending}
                  >
                    Recommencer
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={commencer}
                  className="cta-principal"
                  disabled={creerSession.isPending}
                >
                  <Play className="size-4 mr-2" fill="currentColor" />
                  Découvrir mon portrait
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-secondary" /> À ton rythme
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-secondary" /> Réponses modifiables
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-secondary" /> Aucun score parfait
              </span>
            </div>
          </div>

          <div className="portrait-preview animate-in fade-in zoom-in-95 duration-700 delay-150">
            <div
              className="portrait-orbit portrait-orbit-one"
              aria-hidden="true"
            />
            <div
              className="portrait-orbit portrait-orbit-two"
              aria-hidden="true"
            />
            <div className="portrait-card portrait-card-main">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Ton portrait
                </span>
                <Compass className="size-5 text-primary" />
              </div>
              <div className="portrait-score">
                <span>liberté</span>
                <span>loyauté</span>
                <span>équité</span>
                <span>sécurité</span>
              </div>
              <div className="space-y-2">
                <div className="insight-line">
                  <span>Ce qui tient</span>
                  <strong>loyauté</strong>
                </div>
                <div className="insight-line">
                  <span>Point de bascule</span>
                  <strong>l'impact sur les autres</strong>
                </div>
              </div>
            </div>
            <div className="portrait-card portrait-card-left">
              <Scale className="size-4 text-primary" />
              <span>Tu arbitres</span>
            </div>
            <div className="portrait-card portrait-card-right">
              <Sparkles className="size-4" />
              <span>Tu te découvres</span>
            </div>
          </div>
        </section>

        <section className="space-y-8" aria-labelledby="reperes-title">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">Trois angles simples</p>
            <h2
              id="reperes-title"
              className="text-3xl md:text-5xl font-serif font-semibold"
            >
              Pars de ce que tu sais déjà de toi.
            </h2>
            <p className="text-lg text-muted-foreground">
              Pas de jargon : tu choisis des phrases concrètes qui te
              ressemblent.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {reperes.map((repere, index) => (
              <article
                key={repere.titre}
                className={`repere-card ${repere.ton}`}
              >
                <div className="flex items-start justify-between">
                  <span className="repere-number">0{index + 1}</span>
                  <span className="repere-icon">
                    <repere.icon className="size-5" />
                  </span>
                </div>
                <div className="mt-10 space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider opacity-70">
                    {repere.titre}
                  </p>
                  <h3 className="text-2xl font-serif font-semibold">
                    {repere.phrase}
                  </h3>
                  <p className="text-sm opacity-75 leading-relaxed">
                    {repere.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="experience-panel">
          <div className="max-w-xl space-y-4">
            <p className="eyebrow eyebrow-light">Le parcours</p>
            <h2 className="text-3xl md:text-5xl font-serif font-semibold text-white">
              Tes réponses dessinent une boussole, pas une étiquette.
            </h2>
            <p className="text-white/65 text-lg leading-relaxed">
              Tu sélectionnes ce qui compte, tu précises pourquoi, puis tu
              tranches des situations où deux valeurs entrent en tension.
            </p>
          </div>
          <ol className="experience-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Choisis</strong>
                <p>Des situations qui te ressemblent.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Précise</strong>
                <p>Ce que chacune protège vraiment.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Arbitre</strong>
                <p>Des dilemmes concrets, sans réponse idéale.</p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Découvre</strong>
                <p>Tes constantes et tes points de bascule.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="duo-panel">
          <div className="duo-icon">
            <Users className="size-6" />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">
              À deux
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold">
              Comparez vos repères, pas vos personnalités.
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Une fois vos portraits terminés, échangez vos codes privés pour
              voir où vos priorités se rejoignent et où elles ouvrent une
              discussion.
            </p>
          </div>
          {session?.etapeCourante === "constellation" && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation(`/session/${session.id}/comparer`)}
            >
              Comparer deux portraits <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </section>

        <details className="rules-disclosure">
          <summary>Confidentialité et règles du jeu</summary>
          <div className="grid md:grid-cols-2 gap-4 pt-5 text-sm text-muted-foreground">
            <p>
              Aucune réponse ne rapporte de points. Tu peux passer une question
              sans te justifier.
            </p>
            <p>
              Le jeu compte seulement tes choix. Il ne devine ni ton humeur, ni
              tes croyances, ni ta personnalité.
            </p>
            <p>
              Ta partie est conservée sur cet appareil et sur le serveur jusqu'à
              ce que tu l'effaces.
            </p>
            <p>
              Ton portrait décrit ce parcours-ci. Il peut évoluer avec le temps
              et le contexte.
            </p>
          </div>
        </details>
      </div>
    </Shell>
  );
}
