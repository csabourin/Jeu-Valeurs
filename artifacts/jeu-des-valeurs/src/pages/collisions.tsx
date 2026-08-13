import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  useGetProgres,
  getGetProgresQueryKey,
  useCreateReponse,
  useUpdateSession
} from "@workspace/api-client-react";
import { ReponseCollisionInputChoix } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoveRight, Loader2, Info } from "lucide-react";

export default function Collisions() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: progres, isLoading } = useGetProgres(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetProgresQueryKey(sessionId),
      refetchOnWindowFocus: false
    }
  });

  const createReponse = useCreateReponse();
  const updateSession = useUpdateSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"choice" | "depend" | "difficulty">("choice");
  const [choice, setChoice] = useState<ReponseCollisionInputChoix | null>(null);
  
  // Depend factor
  const [factor, setFactor] = useState<string>("");
  const [customFactor, setCustomFactor] = useState("");
  
  // Difficulty & Certitude
  const [difficulty, setDifficulty] = useState<number>(3);
  const [certitude, setCertitude] = useState<number>(3);

  // Reset local state when next dilemma loads
  useEffect(() => {
    if (progres?.prochaineDilemme) {
      setStep("choice");
      setChoice(null);
      setFactor("");
      setCustomFactor("");
      setDifficulty(3);
      setCertitude(3);
    }
  }, [progres?.prochaineDilemme?.valeurA, progres?.prochaineDilemme?.valeurB]);

  const handleChoice = (c: ReponseCollisionInputChoix) => {
    setChoice(c);
    if (c === "ca_depend") {
      setStep("depend");
    } else if (c === "passer") {
      submitReponse(c);
    } else {
      setStep("difficulty");
    }
  };

  const handleDependNext = () => {
    if (!factor) return;
    setStep("difficulty");
  };

  const submitReponse = (finalChoice?: ReponseCollisionInputChoix) => {
    if (!progres?.prochaineDilemme) return;
    
    setIsSubmitting(true);
    const actChoice = finalChoice || choice!;
    
    createReponse.mutate({
      sessionId,
      data: {
        valeurA: progres.prochaineDilemme.valeurA!,
        valeurB: progres.prochaineDilemme.valeurB!,
        dilemmeId: progres.prochaineDilemme.dilemmeId,
        choix: actChoice,
        facteurDepend: actChoice === "ca_depend" ? factor : null,
        facteurDependLibre: factor === "autre" ? customFactor : null,
        difficulte: actChoice !== "passer" ? difficulty : null,
        certitude: actChoice !== "passer" ? certitude : null
      }
    }, {
      onSuccess: () => {
        // Refetch progress to get next dilemma
        queryClient.invalidateQueries({ queryKey: getGetProgresQueryKey(sessionId) }).then(() => {
          setIsSubmitting(false);
        });
      },
      onError: () => setIsSubmitting(false)
    });
  };

  const handleFinish = () => {
    updateSession.mutate({
      sessionId,
      data: { etapeCourante: "constellation" }
    }, {
      onSuccess: () => {
        setLocation(`/session/${sessionId}/constellation`);
      }
    });
  };

  if (isLoading) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const dil = progres?.prochaineDilemme;
  const isFinished = !dil;
  const percent = progres ? (progres.nombreReponses / (progres.nombreCollisions || 1)) * 100 : 0;

  if (isFinished) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center text-accent mb-4">
            <Info className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-serif font-bold">Exploration terminée</h2>
          <p className="text-lg text-muted-foreground">
            Vous avez parcouru toutes les tensions possibles entre vos valeurs sélectionnées.
            Il est temps de découvrir votre constellation.
          </p>
          <Button size="lg" onClick={handleFinish} className="w-full sm:w-auto h-14 px-8 text-lg">
            Découvrir ma constellation <MoveRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell sessionId={sessionId}>
      <div className="max-w-3xl mx-auto w-full flex flex-col min-h-[70vh]">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
            <span>Tensions explorées</span>
            <span>{progres?.nombreReponses} / {progres?.nombreCollisions}</span>
          </div>
          <Progress value={Math.min(100, Math.max(0, percent))} className="h-2" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {step === "choice" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-8">
              <div className="text-center space-y-4">
                <h2 className="text-2xl text-muted-foreground font-serif italic">Entre ces deux chemins,</h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                  Lequel privilégiez-vous ?
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover-elevate border-border/60"
                  onClick={() => handleChoice("A")}
                >
                  <CardContent className="flex items-center justify-center p-8 md:p-12 min-h-[200px] text-center">
                    <span className="text-2xl md:text-3xl font-serif font-semibold">{dil.valeurA}</span>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover-elevate border-border/60"
                  onClick={() => handleChoice("B")}
                >
                  <CardContent className="flex items-center justify-center p-8 md:p-12 min-h-[200px] text-center">
                    <span className="text-2xl md:text-3xl font-serif font-semibold">{dil.valeurB}</span>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button variant="outline" className="rounded-full" onClick={() => handleChoice("ca_depend")}>
                  Ça dépend...
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => handleChoice("je_ne_sais_pas")}>
                  Je ne sais pas
                </Button>
                <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => handleChoice("passer")}>
                  Passer cette tension
                </Button>
              </div>
            </div>
          )}

          {step === "depend" && (
            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-serif font-bold">Ça dépend de quoi ?</h3>
                <p className="text-muted-foreground text-lg">{dil.valeurA} vs {dil.valeurB}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {[
                  { id: "cout_personnel", label: "Coût personnel" },
                  { id: "ampleur_impact", label: "Ampleur de l'impact" },
                  { id: "proximite_sociale", label: "Proximité sociale" },
                  { id: "urgence", label: "L'urgence" },
                  { id: "responsabilite", label: "Ma responsabilité" },
                  { id: "autre", label: "Autre..." }
                ].map(opt => (
                  <Button
                    key={opt.id}
                    variant={factor === opt.id ? "default" : "outline"}
                    className="h-16 whitespace-normal text-center leading-tight"
                    onClick={() => setFactor(opt.id)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {factor === "autre" && (
                <div className="max-w-xl mx-auto">
                  <Input 
                    placeholder="De quoi cela dépend-il ?"
                    value={customFactor}
                    onChange={(e) => setCustomFactor(e.target.value)}
                    className="h-14 text-lg bg-card"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex justify-center gap-4 pt-8">
                <Button variant="ghost" onClick={() => setStep("choice")}>Retour</Button>
                <Button size="lg" disabled={!factor || (factor === "autre" && !customFactor)} onClick={handleDependNext}>
                  Continuer <MoveRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "difficulty" && (
            <div className="space-y-12 animate-in slide-in-from-right-8 fade-in max-w-xl mx-auto w-full">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-serif font-bold">Derniers détails</h3>
                <p className="text-muted-foreground">À quel point cette décision était-elle évidente ?</p>
              </div>

              <div className="space-y-8 bg-card border border-border/50 rounded-2xl p-6 md:p-8">
                <div className="space-y-4">
                  <label className="text-lg font-medium block">Niveau de difficulté du dilemme</label>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Facile</span>
                    <div className="flex-1 flex justify-between px-4">
                      {[1,2,3,4,5].map(v => (
                        <button
                          key={v}
                          onClick={() => setDifficulty(v)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                            difficulty === v 
                              ? 'bg-primary text-primary-foreground scale-110 shadow-md' 
                              : 'bg-muted/50 text-foreground hover:bg-muted'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Déchirant</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/40">
                  <label className="text-lg font-medium block">Votre certitude face au choix</label>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Hésitant</span>
                    <div className="flex-1 flex justify-between px-4">
                      {[1,2,3,4,5].map(v => (
                        <button
                          key={v}
                          onClick={() => setCertitude(v)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                            certitude === v 
                              ? 'bg-accent text-accent-foreground scale-110 shadow-md' 
                              : 'bg-muted/50 text-foreground hover:bg-muted'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Absolu</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="ghost" onClick={() => setStep(choice === "ca_depend" ? "depend" : "choice")} disabled={isSubmitting}>
                  Retour
                </Button>
                <Button size="lg" onClick={() => submitReponse()} disabled={isSubmitting} className="min-w-[150px]">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Valider"}
                </Button>
              </div>
            </div>
          )}

        </div>

        <div className="mt-8 pt-8 border-t border-border/30 text-center">
          <Button variant="ghost" size="sm" onClick={handleFinish} className="text-muted-foreground">
            Arrêter ici et voir ma constellation
          </Button>
        </div>
      </div>
    </Shell>
  );
}
