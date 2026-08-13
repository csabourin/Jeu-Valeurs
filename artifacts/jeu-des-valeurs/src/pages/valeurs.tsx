import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  useListCartesSession,
  getListCartesSessionQueryKey,
  useUpdateCarteSession,
  useUpdateSession
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { MoveRight, MoveLeft, X, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Valeurs() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: sessionCartes, isLoading } = useListCartesSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListCartesSessionQueryKey(sessionId)
    }
  });

  const updateCarte = useUpdateCarteSession();
  const updateSession = useUpdateSession();

  const [localValues, setLocalValues] = useState<Record<number, string[]>>({});
  const [newValues, setNewValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (sessionCartes) {
      const initial: Record<number, string[]> = {};
      sessionCartes.forEach(c => {
        // Initially, if valeursConfirmées is empty, prepopulate with valeursSuggérées
        initial[c.id] = c.valeursConfirmées?.length ? c.valeursConfirmées : (c.valeursSuggérées || []);
      });
      setLocalValues(initial);
    }
  }, [sessionCartes]);

  const handleToggleValue = (carteId: number, value: string) => {
    setLocalValues(prev => {
      const current = prev[carteId] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      // Fire mutation
      updateCarte.mutate({
        sessionId,
        carteSessionId: carteId,
        data: { valeursConfirmées: updated }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) })
      });
      
      return { ...prev, [carteId]: updated };
    });
  };

  const handleAddValue = (carteId: number) => {
    const val = newValues[carteId]?.trim();
    if (!val) return;

    setLocalValues(prev => {
      const current = prev[carteId] || [];
      if (current.includes(val)) return prev;
      
      const updated = [...current, val];
      
      updateCarte.mutate({
        sessionId,
        carteSessionId: carteId,
        data: { valeursConfirmées: updated }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) })
      });

      return { ...prev, [carteId]: updated };
    });
    setNewValues(prev => ({ ...prev, [carteId]: "" }));
  };

  const handleContinue = () => {
    updateSession.mutate({
      sessionId,
      data: { etapeCourante: "collisions" }
    }, {
      onSuccess: () => {
        setLocation(`/session/${sessionId}/collisions`);
      }
    });
  };

  if (isLoading) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-primary">Chargement...</div>
        </div>
      </Shell>
    );
  }

  if (!sessionCartes || sessionCartes.length === 0) {
    return (
      <Shell sessionId={sessionId}>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif mb-4">Aucune carte sélectionnée</h2>
          <Button onClick={() => setLocation(`/session/${sessionId}/cartes`)}>
            Retourner aux cartes
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell sessionId={sessionId}>
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/session/${sessionId}/cartes`)} className="-ml-4 text-muted-foreground">
            <MoveLeft className="w-4 h-4 mr-2" /> Cartes
          </Button>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Affinez vos mots
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Pour chaque carte retenue, confirmez les valeurs sous-jacentes. 
            Gardez celles qui vous parlent, enlevez les autres, ou ajoutez vos propres mots.
          </p>
        </header>

        <div className="space-y-6">
          {sessionCartes.map(carte => {
            const confirmed = localValues[carte.id] || [];
            // All suggestions + any custom confirmed that wasn't a suggestion
            const allOptions = Array.from(new Set([...(carte.valeursSuggérées || []), ...confirmed]));

            return (
              <Card key={carte.id} className="border-border/60">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {carte.famille === 'lignes_rouges' ? '🛑 Ligne rouge' : 
                       carte.famille === 'horizons' ? '🌅 Horizon' : '💎 Trésor'}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{carte.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {allOptions.map(val => {
                      const isSelected = confirmed.includes(val);
                      return (
                        <button
                          key={val}
                          onClick={() => handleToggleValue(carte.id, val)}
                          className={`
                            inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            border
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-background text-foreground border-border hover:border-primary/50'
                            }
                          `}
                        >
                          {val}
                          {isSelected && <X className="w-3 h-3 ml-1.5 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center gap-2 max-w-sm">
                    <Input 
                      placeholder="Ajouter une valeur (ex: Créativité)..." 
                      value={newValues[carte.id] || ""}
                      onChange={e => setNewValues(prev => ({ ...prev, [carte.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddValue(carte.id);
                        }
                      }}
                      className="bg-muted/30 border-border/50"
                    />
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={() => handleAddValue(carte.id)}
                      disabled={!newValues[carte.id]?.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-8">
          <Button size="lg" onClick={handleContinue}>
            Plonger dans les tensions <MoveRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Shell>
  );
}
