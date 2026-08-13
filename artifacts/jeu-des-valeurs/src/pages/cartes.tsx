import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useListCartessCatalogue, 
  getListCartessCatalogueQueryKey,
  useListCartesSession,
  getListCartesSessionQueryKey,
  useAddCarteSession,
  useRemoveCarteSession,
  useUpdateSession
} from "@workspace/api-client-react";
import { CarteCatalogueFamille } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Check, Plus, MoveRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Cartes() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CarteCatalogueFamille>(CarteCatalogueFamille.lignes_rouges);

  const { data: catalogueCartes, isLoading: isLoadingCatalogue } = useListCartessCatalogue(undefined, {
    query: { queryKey: getListCartessCatalogueQueryKey() }
  });

  const { data: sessionCartes, isLoading: isLoadingSessionCartes } = useListCartesSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListCartesSessionQueryKey(sessionId)
    }
  });

  const addCarte = useAddCarteSession();
  const removeCarte = useRemoveCarteSession();
  const updateSession = useUpdateSession();

  const selectedCatalogueIds = useMemo(() => {
    if (!sessionCartes) return new Set<number>();
    return new Set(sessionCartes.filter(c => !c.estPersonnalisée && c.catalogueCarteId).map(c => c.catalogueCarteId as number));
  }, [sessionCartes]);

  const handleToggleCarte = (carte: any) => {
    const existing = sessionCartes?.find(c => c.catalogueCarteId === carte.id);
    
    if (existing) {
      removeCarte.mutate({ sessionId, carteSessionId: existing.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) });
        }
      });
    } else {
      addCarte.mutate({
        sessionId,
        data: {
          catalogueCarteId: carte.id,
          famille: carte.famille as any,
          label: carte.label,
          description: carte.description,
          valeursSuggérées: carte.valeursSuggérées,
          estPersonnalisée: false
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) });
        }
      });
    }
  };

  const handleContinue = () => {
    updateSession.mutate({
      sessionId,
      data: { etapeCourante: "confirmation_valeurs" }
    }, {
      onSuccess: () => {
        setLocation(`/session/${sessionId}/valeurs`);
      }
    });
  };

  const familyLabels = {
    lignes_rouges: { label: "🛑 Lignes rouges", desc: "Ce qui est non négociable pour vous." },
    horizons: { label: "🌅 Horizons", desc: "Ce vers quoi vous tendez à long terme." },
    tresors: { label: "💎 Trésors", desc: "Ce que vous voulez protéger au quotidien." }
  };

  if (isLoadingCatalogue || isLoadingSessionCartes) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex space-x-2 text-primary">
            <div className="w-3 h-3 bg-current rounded-full"></div>
            <div className="w-3 h-3 bg-current rounded-full delay-75"></div>
            <div className="w-3 h-3 bg-current rounded-full delay-150"></div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell sessionId={sessionId}>
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Le paysage
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explorez ces cartes et choisissez celles qui résonnent le plus avec votre situation actuelle. 
            Il n'y a pas de limite, mais essayez de vous concentrer sur l'essentiel.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CarteCatalogueFamille)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl">
            {(Object.entries(familyLabels) as [CarteCatalogueFamille, any][]).map(([key, info]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
              >
                <span className="font-serif text-sm md:text-base">{info.label}</span>
                <span className="ml-2 hidden sm:inline-flex bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {sessionCartes?.filter(c => c.famille === key).length || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(familyLabels) as CarteCatalogueFamille[]).map((family) => {
            const cartesInFamily = catalogueCartes?.filter(c => c.famille === family) || [];
            
            return (
              <TabsContent key={family} value={family} className="mt-8 space-y-6 focus-visible:outline-none">
                <div className="bg-card border border-border/50 rounded-xl p-6 text-center shadow-sm">
                  <h2 className="text-xl font-serif font-semibold mb-2">{familyLabels[family].label}</h2>
                  <p className="text-muted-foreground">{familyLabels[family].desc}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cartesInFamily.map((carte) => {
                    const isSelected = selectedCatalogueIds.has(carte.id);
                    return (
                      <Card 
                        key={carte.id} 
                        className={`cursor-pointer transition-all duration-200 hover-elevate ${
                          isSelected 
                            ? 'border-primary ring-1 ring-primary/20 bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handleToggleCarte(carte)}
                        data-testid={`card-${carte.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{carte.label}</CardTitle>
                            <div className={`rounded-full p-1 border ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-background text-muted-foreground border-border'
                            }`}>
                              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                            {carte.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {carte.valeursSuggérées.map(val => (
                              <Badge key={val} variant="secondary" className="text-[10px] font-normal opacity-80">
                                {val}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/40 z-20 md:static md:bg-transparent md:border-t-0 md:p-0">
          <div className="container max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-muted-foreground font-medium hidden sm:block">
              {sessionCartes?.length || 0} carte(s) sélectionnée(s)
            </div>
            <Button 
              size="lg" 
              className="w-full sm:w-auto ml-auto"
              disabled={!sessionCartes || sessionCartes.length === 0}
              onClick={handleContinue}
            >
              Continuer vers les valeurs <MoveRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
        
        <div className="h-16 md:h-0"></div> {/* Spacer for fixed mobile footer */}
      </div>
    </Shell>
  );
}
