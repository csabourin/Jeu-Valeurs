#!/usr/bin/env python3
"""Est-ce que l'API qui tourne parle la même version que l'écran ?

    python3 scripts/verifier-api.py <sessionId> [url-de-base]

Le frontend est un paquet statique, l'API un service à part : les deux ne se
déploient pas au même instant. Quand l'API est restée en arrière, elle renvoie
encore les anciens compteurs (`duelsPlanifies`…) et la page de partie lit des
champs absents. Tout s'affiche alors à zéro — « 0 paire de valeurs sur 0 » — et
l'écran de fin apparaît alors que la partie n'a jamais commencé.

L'identifiant de session est dans le `localStorage` du navigateur, sous
« jdv_session_id ».
"""

import json
import os
import sys
import urllib.error
import urllib.request

ATTENDUS = [
    "comparaisonsPlanifiees",
    "comparaisonsRepondues",
    "pairesPertinentes",
    "pairesCouvertes",
    "tensionsRestantes",
    "premiereOrdinationPrete",
]

# Ce que renvoyait l'API d'avant la refonte. Leur présence signe la version.
ANCIENS = [
    "duelsPlanifies",
    "duelsRepondus",
    "seriesPlanifiees",
    "seriesTerminees",
    "arbitragesPlanifies",
]


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    session = sys.argv[1]
    base = (
        sys.argv[2]
        if len(sys.argv) > 2
        else "http://localhost:" + os.environ.get("PORT", "8080")
    )
    url = base.rstrip("/") + "/api/sessions/" + session + "/progres"

    try:
        with urllib.request.urlopen(url, timeout=10) as reponse:
            donnees = json.load(reponse)
    except urllib.error.HTTPError as erreur:
        print("✗ l'API a répondu " + str(erreur.code) + " sur " + url)
        return 1
    except Exception as erreur:  # réseau, JSON, tout ce qui empêche de lire
        print("✗ impossible de lire " + url + " : " + str(erreur))
        return 1

    manquants = [c for c in ATTENDUS if c not in donnees]
    survivants = [c for c in ANCIENS if c in donnees]

    if manquants:
        print("✗ API dépassée. Champs attendus et absents :")
        for champ in manquants:
            print("    " + champ)
        if survivants:
            print("  Elle renvoie encore les anciens :")
            for champ in survivants:
                print("    " + champ)
        print()
        print("  → reconstruire et relancer l'API :")
        print("      pnpm --filter @workspace/api-server run build")
        print("    puis relancer le workflow (c'est lui qui injecte PORT).")
        print("  → si le schéma a bougé aussi :")
        print("      pnpm --filter @workspace/db run push")
        return 1

    print("✓ API à jour.")
    for champ in ["phase", "nombreCartes", "nombreValeurs"] + ATTENDUS:
        print("  " + champ.ljust(24) + " : " + str(donnees.get(champ)))
    question = "oui" if donnees.get("prochaineQuestion") else "AUCUNE"
    print("  " + "prochaineQuestion".ljust(24) + " : " + question)

    if donnees.get("comparaisonsPlanifiees") == 0:
        print()
        print("  L'API est à jour, mais aucune comparaison n'est jouable.")
        print("  Il faut au moins une limite et un enjeu qui portent deux")
        print("  valeurs différentes et opposables.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
