import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  useListCartesSession,
  getListCartesSessionQueryKey,
  useUpdateCarteSession,
  useUpdateSession
} from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { MoveRight, MoveLeft, X, Plus, Star, Save } from "lucide-react";
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
  const [localLabels, setLocalLabels] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sessionCartes) {
      setLocalValues((current) =>
        Object.fromEntries(
          sessionCartes.map((card) => [
            card.id,
            current[card.id] ??
              (card.valeursConfirmées?.length
                ? card.valeursConfirmées
                : card.valeursSuggérées || []),
          ]),
        ),
      );
      setLocalLabels((current) =>
        Object.fromEntries(
          sessionCartes.map((card) => [
            card.id,
            current[card.id] ?? card.label,
          ]),
        ),
      );
    }
  }, [sessionCartes]);

  const handleToggleValue = (carteId: number, value: string) => {
    const current = localValues[carteId] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    const carte = sessionCartes?.find((item) => item.id === carteId);

    setLocalValues((previous) => ({ ...previous, [carteId]: updated }));
    updateCarte.mutate({
        sessionId,
        carteSessionId: carteId,
        data: {
          valeursConfirmées: updated,
          valeurPrincipale:
            carte?.valeurPrincipale === value && !updated.includes(value)
              ? null
              : carte?.valeurPrincipale,
        }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) })
      });
  };

  const handleSaveLabel = (carteId: number) => {
    const label = localLabels[carteId]?.trim();
    if (!label) return;
    updateCarte.mutate(
      { sessionId, carteSessionId: carteId, data: { label } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListCartesSessionQueryKey(sessionId),
          }),
      },
    );
  };

  const handleSetPrimary = (carteId: number, value: string) => {
    updateCarte.mutate(
      {
        sessionId,
        carteSessionId: carteId,
        data: {
          valeursConfirmées: localValues[carteId] ?? [],
          valeurPrincipale: value,
        },
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListCartesSessionQueryKey(sessionId),
          }),
      },
    );
  };

  const handleAddValue = (carteId: number) => {
    const val = newValues[carteId]?.trim();
    if (!val) return;
    const current = localValues[carteId] || [];
    if (current.includes(val)) return;
    const updated = [...current, val];

    setLocalValues((previous) => ({ ...previous, [carteId]: updated }));
    updateCarte.mutate({
        sessionId,
        carteSessionId: carteId,
        data: { valeursConfirmées: updated }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartesSessionQueryKey(sessionId) })
      });
    setNewValues(prev => ({ ...prev, [carteId]: "" }));
  };

  const handleContinue = async () => {
    if (!sessionCartes || isSaving) return;
    setIsSaving(true);
    try {
      await Promise.all(
        sessionCartes.map((card) =>
          updateCarte.mutateAsync({
            sessionId,
            carteSessionId: card.id,
            data: {
              valeursConfirmées: localValues[card.id] ?? [],
              valeurPrincipale:
                card.valeurPrincipale &&
                (localValues[card.id] ?? []).includes(card.valeurPrincipale)
                  ? card.valeurPrincipale
                  : null,
            },
          }),
        ),
      );
      updateSession.mutate(
        {
          sessionId,
          data: { etapeCourante: "collisions" },
        },
        {
          onSuccess: () => {
            setLocation(`/session/${sessionId}/collisions`);
          },
          onSettled: () => setIsSaving(false),
        },
      );
    } catch {
      setIsSaving(false);
    }
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

  const distinctConfirmedValues = new Set(
    Object.values(localValues).flat().filter(Boolean),
  );

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
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <label htmlFor={`card-label-${carte.id}`} className="sr-only">
                      Reformuler la carte {carte.label}
                    </label>
                    <Input
                      id={`card-label-${carte.id}`}
                      value={localLabels[carte.id] ?? carte.label}
                      onChange={(event) =>
                        setLocalLabels((current) => ({
                          ...current,
                          [carte.id]: event.target.value,
                        }))
                      }
                      maxLength={240}
                      className="text-lg font-semibold bg-background/70"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveLabel(carte.id)}
                      disabled={
                        !localLabels[carte.id]?.trim() ||
                        localLabels[carte.id]?.trim() === carte.label
                      }
                    >
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Enregistrer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {allOptions.map(val => {
                      const isSelected = confirmed.includes(val);
                      const isPrimary = carte.valeurPrincipale === val;
                      return (
                        <span key={val} className="inline-flex items-stretch rounded-full border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleToggleValue(carte.id, val)}
                            aria-pressed={isSelected}
                            className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all min-h-11 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-foreground hover:bg-muted'
                            }`}
                          >
                            {val}
                            {isSelected && <X className="w-3 h-3 ml-1.5 opacity-70" aria-hidden="true" />}
                          </button>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(carte.id, val)}
                              aria-pressed={isPrimary}
                              aria-label={`${isPrimary ? "Valeur principale" : "Choisir comme valeur principale"} : ${val}`}
                              className={`px-3 border-l min-h-11 ${
                                isPrimary
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-background hover:bg-muted'
                              }`}
                            >
                              <Star className="w-4 h-4" fill={isPrimary ? "currentColor" : "none"} aria-hidden="true" />
                            </button>
                          )}
                        </span>
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
                      aria-label={`Ajouter une valeur pour la carte ${carte.label}`}
                    />
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={() => handleAddValue(carte.id)}
                      disabled={!newValues[carte.id]?.trim()}
                      aria-label={`Ajouter cette valeur à la carte ${carte.label}`}
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
          <div className="space-y-2 text-right">
            {distinctConfirmedValues.size < 2 && (
              <p className="text-sm text-destructive" role="status">
                Confirmez au moins deux valeurs distinctes pour créer une collision.
              </p>
            )}
          <Button size="lg" onClick={handleContinue} disabled={distinctConfirmedValues.size < 2 || isSaving}>
            {isSaving ? "Enregistrement…" : "Plonger dans les tensions"} <MoveRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
