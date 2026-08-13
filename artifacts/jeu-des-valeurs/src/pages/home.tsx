import { useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateSession, useGetSession } from "@workspace/api-client-react";
import { Map, Tent, Sparkles, MoveRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { SessionEtapeCourante } from "@workspace/api-client-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    const id = localStorage.getItem('jdv_session_id');
    if (id) setExistingSessionId(id);
  }, []);

  const createSession = useCreateSession();
  
  const { data: session, isLoading: isLoadingSession } = useGetSession(existingSessionId || "", {
    query: {
      enabled: !!existingSessionId,
      retry: false
    }
  });

  const handleStart = () => {
    createSession.mutate(
      { data: { etapeCourante: "selection_cartes" } },
      {
        onSuccess: (newSession) => {
          localStorage.setItem('jdv_session_id', newSession.id);
          setLocation(`/session/${newSession.id}/cartes`);
        }
      }
    );
  };

  const handleResume = () => {
    if (!session) return;
    const pathMap: Record<SessionEtapeCourante, string> = {
      accueil: "cartes", // Should not really happen
      selection_cartes: "cartes",
      confirmation_valeurs: "valeurs",
      collisions: "collisions",
      constellation: "constellation"
    };
    setLocation(`/session/${session.id}/${pathMap[session.etapeCourante]}`);
  };

  return (
    <Shell sessionId={existingSessionId || undefined}>
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center space-y-12">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
            <CompassIcon className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground font-semibold leading-tight">
            Explorez votre <span className="text-primary italic">boussole</span> intérieure
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Un carnet de voyage interactif pour découvrir vos priorités, identifier vos lignes rouges et naviguer vos contradictions. 
          </p>
        </div>

        <Card className="w-full bg-card/50 backdrop-blur-sm border-border/50 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-150">
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-3">
                <Map className="w-6 h-6 text-secondary" />
                <h3 className="font-semibold text-lg font-serif">1. Le paysage</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez les cartes qui résonnent avec vous. Famille par famille.</p>
              </div>
              <div className="space-y-3">
                <Tent className="w-6 h-6 text-accent" />
                <h3 className="font-semibold text-lg font-serif">2. Les tensions</h3>
                <p className="text-sm text-muted-foreground">Faites face à des dilemmes délicats pour voir comment vos valeurs interagissent.</p>
              </div>
              <div className="space-y-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="font-semibold text-lg font-serif">3. La constellation</h3>
                <p className="text-sm text-muted-foreground">Découvrez une cartographie nuancée de vos priorités, sans jugement.</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground italic text-left border border-border/50">
              <span className="font-semibold not-italic block mb-1">Avant de partir :</span>
              Ceci n'est ni un test psychométrique, ni un diagnostic. C'est un espace de réflexion. Il n'y a pas de "bonnes" valeurs.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {existingSessionId && (session || isLoadingSession) ? (
                <>
                  <Button 
                    size="lg" 
                    onClick={handleResume} 
                    className="w-full sm:w-auto text-base h-12 px-8"
                    disabled={isLoadingSession}
                  >
                    Reprendre mon exploration <MoveRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={handleStart} 
                    className="w-full sm:w-auto text-base h-12 px-8"
                  >
                    Recommencer à zéro
                  </Button>
                </>
              ) : (
                <Button 
                  size="lg" 
                  onClick={handleStart} 
                  className="w-full sm:w-auto text-base h-12 px-8 shadow-md"
                  disabled={createSession.isPending}
                >
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Commencer l'exploration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
