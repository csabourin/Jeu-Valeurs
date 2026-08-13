import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useGetConstellation,
  getGetConstellationQueryKey
} from "@workspace/api-client-react";
import { Loader2, Zap, Scale, Compass, MapPinOff } from "lucide-react";

export default function Constellation() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();

  const { data: constellation, isLoading } = useGetConstellation(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetConstellationQueryKey(sessionId)
    }
  });

  if (isLoading || !constellation) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-serif animate-pulse">Cartographie en cours...</p>
        </div>
      </Shell>
    );
  }

  const { tendances, tensions, observations, couverture, stabilite } = constellation;

  return (
    <Shell sessionId={sessionId}>
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="space-y-4 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Votre Constellation
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Voici ce qui ressort de vos choix. Souvenez-vous : il n'y a pas de hiérarchie parfaite, 
            seulement des tendances qui reflètent qui vous êtes en ce moment.
          </p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-primary mb-1">
              {Math.round(couverture * 100)}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Exploration</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-accent mb-1">
              {Math.round(stabilite * 100)}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Certitude moy.</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-secondary mb-1">
              {tendances.length}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Valeurs actives</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-destructive mb-1">
              {tensions.length}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Tensions fortes</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Tendencies */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary" /> Pôles magnétiques
            </h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 space-y-6">
                {tendances.slice(0, 5).map((t, idx) => (
                  <div key={t.valeur} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-serif text-primary shadow-sm font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-lg">{t.valeur}</div>
                      <div className="text-sm text-muted-foreground">
                        Privilégiée {t.victoiresA + t.victoiresB} fois sur {t.totalCollisions}
                      </div>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                      <div 
                        className="h-full bg-primary rounded-full opacity-80" 
                        style={{ width: `${Math.max(5, (t.scoreNet + 1) * 50)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2 pt-4">
              <Zap className="w-6 h-6 text-accent" /> Tensions remarquables
            </h2>
            <div className="grid gap-4">
              {tensions.length > 0 ? tensions.map((tension, i) => (
                <Card key={i} className="border-accent/20 bg-accent/5">
                  <CardContent className="p-5 flex items-center justify-between">
                    <span className="font-medium">{tension.valeurA}</span>
                    <div className="flex-1 border-b border-dashed border-accent/40 mx-4 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-xs px-2 py-0.5 rounded-full text-accent font-medium border border-accent/20">
                        VS
                      </div>
                    </div>
                    <span className="font-medium">{tension.valeurB}</span>
                  </CardContent>
                </Card>
              )) : (
                <div className="text-muted-foreground italic bg-muted/30 p-4 rounded-lg text-sm">
                  Aucune tension majeure identifiée pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Observations */}
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Scale className="w-6 h-6 text-secondary" /> Observations
            </h2>
            <div className="space-y-4">
              {observations.map((obs) => (
                <div key={obs.id} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm text-sm">
                  <p className="leading-relaxed mb-3">{obs.texte}</p>
                  {obs.reponsesSources?.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                      Pourquoi ?
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {tendances.some(t => t.territoireInexplore) && (
              <div className="pt-6">
                <h3 className="font-serif font-semibold flex items-center gap-2 mb-4 text-muted-foreground">
                  <MapPinOff className="w-4 h-4" /> Zones d'ombre
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tendances.filter(t => t.territoireInexplore).map(t => (
                    <span key={t.valeur} className="bg-muted/50 border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-full">
                      {t.valeur}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-12 pb-8">
          <Button variant="outline" size="lg" onClick={() => setLocation(`/session/${sessionId}/collisions`)}>
            Retourner explorer
          </Button>
        </div>
      </div>
    </Shell>
  );
}
