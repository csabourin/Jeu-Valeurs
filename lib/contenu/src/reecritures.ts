/**
 * Réécriture des cartes importées pour qu'elles se lisent d'un coup.
 *
 * Les 825 cartes importées sont arrivées en registre universitaire : phrases
 * longues, vocabulaire abstrait (« déshumaniser », « réciprocité »,
 * « instrumentaliser »), et des précautions d'essai (« uniquement parce que »,
 * « systématiquement », « automatiquement ») qui diluent ce qu'il y a à
 * ressentir.
 *
 * ⚠️ **Cette passe a été faite sous une consigne erronée** — « registre
 * 12-14 ans » — qui a été lue comme « contenu pour enfants » alors qu'elle ne
 * visait que la lisibilité. Le jeu s'adresse à des adultes de tous niveaux de
 * scolarité. Certaines réécritures ont donc vidé des cartes de leur objet en
 * leur retirant ce qu'un adulte possède réellement — `T077` avait transformé
 * « Mon expérience professionnelle » en « Tout ce que j'ai appris en le
 * faisant », ce qui n'est plus la même chose : on peut perdre un emploi, pas
 * ce qu'on a appris. Les cartes de travail et d'argent ont été reprises ; le
 * reste des 494 réécritures n'a pas été réaudité sous la bonne consigne. Les
 * libellés d'origine sont intacts dans `data/*.json`, donc rien n'est perdu.
 *
 * Ce fichier ne remplace pas les données d'origine : `data/*.json` reste intact,
 * et la réécriture est une couche par-dessus, indexée par identifiant. On peut
 * donc comparer les deux à tout moment, et une carte sans réécriture garde
 * simplement son libellé d'origine.
 *
 * Ce que la réécriture cherche :
 *   • des mots de tous les jours, sans jargon moral ;
 *   • court — la carte doit se lire d'un coup d'œil, pas se décortiquer ;
 *   • **la même tension** qu'à l'origine, pour que la catégorie et donc les
 *     valeurs suggérées restent justes ;
 *   • que ça touche. Une carte tiède ne fait rien découvrir : on garde le poids
 *     de la situation, on enlève seulement la distance.
 *
 * Ce qu'elle ne fait pas : adoucir. « Faire souffrir un animal pour m'amuser »
 * reste dur à lire, et c'est exactement ce qui doit rester.
 */

/** Identifiant d'origine → libellé réécrit. */
export const reecritures: Record<string, string> = {
  // ── Lignes rouges ─────────────────────────────────────────────────────────

  // Dignité et respect de la personne
  LR001: "Humilier quelqu'un devant les autres pour avoir l'air meilleur.",
  LR002: "Traiter quelqu'un de haut à cause d'où il vient.",
  LR003: "M'en prendre à quelqu'un qui ne peut pas se défendre.",
  LR004: "Ne voir quelqu'un que pour ce qu'il peut m'apporter.",
  LR005: "Parler d'un groupe de gens comme s'ils n'étaient pas de vraies personnes.",
  LR006: "Rire de quelqu'un qui vient d'échouer.",
  LR007: "Décider que quelqu'un ne mérite plus de respect parce qu'il a mal agi.",
  LR008: "Mettre quelqu'un de côté parce qu'il n'est pas comme nous.",
  LR009: "Couper la parole à quelqu'un parce que j'ai plus d'autorité que lui.",
  LR010: "Exiger un respect que je ne donne pas moi-même.",

  // Vérité, intégrité et confiance
  LR011: "Mentir pour gagner quelque chose qu'un autre va perdre.",
  LR012: "Accuser quelqu'un d'une chose que je sais qu'il n'a pas faite.",
  LR013: "Dire que j'ai fait le travail de quelqu'un d'autre.",
  LR014: "Changer ma version des faits en laissant un autre payer à ma place.",
  LR015: "Promettre quelque chose que je sais que je ne ferai pas.",
  LR016: "Répéter un secret qu'on m'a confié, sans vraie raison.",
  LR017: "Cacher quelque chose d'important à quelqu'un qui doit décider.",
  LR018: "Jouer sur les peurs de quelqu'un pour qu'il fasse ce que je veux.",
  LR019: "Faire croire que je sais faire quelque chose alors qu'on compte sur moi.",
  LR020: "Défendre encore une chose fausse pour ne pas avoir l'air fou.",

  // Loyauté, engagements et relations
  LR021: "Lâcher quelqu'un qui compte sur moi parce que c'est devenu dur.",
  LR022: "Trahir un proche pour améliorer ma situation.",
  LR023: "Briser un engagement dès qu'une meilleure offre arrive.",
  LR024: "Me servir contre quelqu'un d'une faiblesse qu'il m'a confiée.",
  LR025: "Toujours prendre dans une relation, sans jamais rien donner.",
  LR026: "Refuser d'aider un proche parce que son problème me dérange.",
  LR027: "Faire semblant d'être un ami pour obtenir quelque chose.",
  LR028: "Monter deux personnes l'une contre l'autre pour me placer.",
  LR029: "Perdre une amitié importante pour une réussite qui compte peu.",
  LR030: "Exiger une fidélité que je ne suis pas prêt à donner.",

  // Famille, proches et responsabilités intergénérationnelles
  LR031: "Laisser tomber quelqu'un de ma famille qui a besoin de moi.",
  LR032: "Avantager les miens au point que quelqu'un d'autre en souffre pour vrai.",
  LR033: "Décider pour mes proches parce que je suis plus vieux qu'eux.",
  LR034: "Ne pas écouter les plus vieux parce qu'ils sont d'une autre époque.",
  LR035: "Exiger qu'un plus jeune obéisse sans jamais le laisser parler.",
  LR036: "Lâcher une responsabilité familiale pour un petit avantage à moi.",
  LR037: "Me servir des liens de famille pour contrôler les choix d'un proche.",
  LR038: "Ne rien transmettre de notre histoire à ceux qui viennent après.",
  LR039: "Faire passer ma famille avant tout le monde, quoi qu'il arrive.",
  LR040: "Faire passer mes projets avant tout ce que je dois à mes proches.",

  // Justice, équité et réciprocité
  LR041: "Me donner un passe-droit que je refuserais à quelqu'un d'autre.",
  LR042: "Punir quelqu'un pour une chose dont je sais qu'il n'est pas responsable.",
  LR043: "Profiter d'une règle en sachant que les autres n'y ont pas accès.",
  LR044: "Décider du sort de quelqu'un sans écouter sa version.",
  LR045: "Changer les règles en cours de route pour gagner.",
  LR046: "Demander aux autres un effort que je refuserais de faire.",
  LR047: "Me servir de ma place pour obtenir ce qu'on ne me donnerait pas autrement.",
  LR048: "Fermer les yeux sur une injustice parce qu'elle m'arrange.",
  LR049: "Partager ce qui appartient à tous selon mes préférences.",
  LR050: "Prendre bien plus que ma part en sachant qu'il va en manquer.",

  // Liberté, autonomie et consentement
  LR051: "Forcer quelqu'un à penser comme moi.",
  LR052: "Décider à la place de quelqu'un une chose qui ne regarde que lui.",
  LR053: "Empêcher quelqu'un de dire qu'il n'est pas d'accord.",
  LR054: "Insister jusqu'à ce que quelqu'un accepte ce qu'il avait refusé.",
  LR055: "Me servir de ce dont quelqu'un dépend pour diriger ses choix.",
  LR056: "Vouloir tout savoir de la vie de quelqu'un sans aucune raison.",
  LR057: "Punir quelqu'un pour un choix différent du mien qui ne nuit à personne.",
  LR058: "Laisser la majorité faire taire chaque fois ceux qui pensent autrement.",
  LR059: "Décider que le choix de quelqu'un ne compte pas parce qu'il me semble bizarre.",
  LR060: "Arrêter de penser par moi-même parce qu'on me le demande.",

  // Autorité, ordre, devoir et responsabilité
  LR061: "Ne pas suivre une règle importante parce qu'elle me dérange.",
  LR062: "Laisser mes responsabilités à d'autres en espérant qu'ils les prennent.",
  LR063: "Faire ce que je veux sans regarder ce que ça coûte aux autres.",
  LR064: "Refuser toute autorité, même celle qui sert à tout le monde.",
  LR065: "Profiter du travail du groupe sans jamais y mettre du mien.",
  LR066: "Casser une règle qui protège les autres pour m'arranger, moi.",
  LR067: "Accepter une responsabilité puis disparaître sans prévenir.",
  LR068: "Ne rien devoir à personne, même quand mon monde a besoin de moi.",
  LR069: "Me servir d'un poste de confiance pour mes propres intérêts.",
  LR070: "Faire ce qu'on me demande alors que je trouve ça profondément injuste.",

  // Harmonie sociale, conflit et appartenance
  LR071: "Provoquer une chicane juste pour qu'on me regarde.",
  LR072: "Ridiculiser quelqu'un en public alors qu'on pouvait en parler à deux.",
  LR073: "Vouloir avoir raison au point de perdre une amitié, pour une niaiserie.",
  LR074: "Refuser tout compromis même quand on ne me demande rien d'essentiel.",
  LR075: "Faire honte à quelqu'un devant les autres sans que ce soit nécessaire.",
  LR076: "Répandre une rumeur parce qu'elle me place bien dans le groupe.",
  LR077: "Sortir quelqu'un du groupe parce qu'il ne pense pas comme nous.",
  LR078: "Demander à quelqu'un de se taire pour la paix, alors qu'il subit une injustice.",
  LR079: "Faire passer mon image avant un groupe qui compte sur moi.",
  LR080: "Faire comme si tout allait bien alors que tout le monde voit le problème.",

  // Tradition, culture et transmission
  LR081: "Rire d'une tradition qui compte pour quelqu'un parce qu'elle m'est étrangère.",
  LR082: "Demander à quelqu'un d'abandonner sa langue pour être accepté.",
  LR083: "Détruire une trace du passé parce que je la trouve dépassée.",
  LR084: "Croire que nos traditions valent forcément mieux que les autres.",
  LR085: "Rejeter une façon de faire juste parce qu'elle est vieille.",
  LR086: "Garder une façon de faire juste parce qu'elle est vieille, même si elle blesse.",
  LR087: "Empêcher les jeunes de poser des questions sur ce qu'on leur transmet.",
  LR088: "Ne pas transmettre ce qu'on m'a appris à ceux qui viennent après.",
  LR089: "Utiliser un symbole important pour d'autres en sachant que ça les blesse.",
  LR090: "Effacer l'histoire d'un groupe parce qu'elle dérange.",

  // Sacré, convictions et sens
  LR091: "Salir exprès ce qui est sacré pour d'autres, juste pour les provoquer.",
  LR092: "Me moquer de ce en quoi quelqu'un croit sincèrement.",
  LR093: "Faire semblant de croire à quelque chose pour en tirer un avantage.",
  LR094: "Me servir des croyances de quelqu'un pour le manipuler.",
  LR095: "Obliger quelqu'un à participer à un rituel contre son gré.",
  LR096: "Empêcher quelqu'un de pratiquer sa tradition parce qu'elle diffère de la mienne.",
  LR097: "Renier ce en quoi je crois pour être approuvé par le groupe.",
  LR098: "Imposer mes convictions à tous sans accepter d'être questionné.",
  LR099: "Traiter ce qui est sacré pour d'autres comme si ça ne valait rien.",
  LR100: "Faire de l'argent avec ce qui est sacré pour d'autres, en sachant que ça les blesse.",

  // Communauté, entraide et réciprocité
  LR101: "Ne jamais aider mon monde tout en comptant sur lui.",
  LR102: "Laisser quelqu'un affronter seul un gros problème alors que je pouvais aider.",
  LR103: "Garder pour moi ce dont je n'ai pas besoin quand d'autres en manquent.",
  LR104: "Garder mes trucs pour moi pour rester le seul à savoir.",
  LR105: "Recevoir beaucoup d'un groupe sans jamais rien lui rendre.",
  LR106: "Prendre sans jamais reconnaître ce que les autres m'ont donné.",
  LR107: "Refuser d'aider quelqu'un parce qu'il n'est pas de mon groupe.",
  LR108: "Aider les miens même quand ça fait une vraie injustice à d'autres.",
  LR109: "Toujours m'oublier pour répondre à toutes les demandes du groupe.",
  LR110: "Passer avant tout le monde, même quand la situation est grave.",

  // Nature, territoire et monde vivant
  LR111: "Abîmer un endroit naturel juste parce que c'est plus pratique.",
  LR112: "Prendre bien plus que ce dont j'ai besoin, sans penser à après.",
  LR113: "Gaspiller quelque chose de rare parce que je peux me le permettre.",
  LR114: "Abîmer un lieu qui compte pour des gens sans même leur demander.",
  LR115: "Voir la nature seulement comme une réserve à ma disposition.",
  LR116: "Faire disparaître un endroit unique pour un petit gain.",
  LR117: "Laisser aux suivants un problème que je pouvais régler.",
  LR118: "Décider d'un territoire sans ceux qui y vivent.",
  LR119: "Utiliser ce qui est à tous sans jamais en prendre soin.",
  LR120: "Interdire tout usage de la nature, même à ceux qui en vivent avec soin.",

  // Pouvoir, statut et leadership
  LR121: "Me servir de mon autorité pour régler un compte personnel.",
  LR122: "Exiger un traitement de faveur à cause de ma place.",
  LR123: "Faire taire ceux qui m'apportent des nouvelles que je n'aime pas.",
  LR124: "Prendre le crédit des réussites et laisser les échecs aux autres.",
  LR125: "Profiter du fait que quelqu'un dépend de moi pour qu'il obéisse.",
  LR126: "Garder une responsabilité que je n'assume plus, juste pour le titre.",
  LR127: "Avantager ceux qui me sont fidèles quand je décide pour tout le groupe.",
  LR128: "Ne pas admettre mon erreur parce que c'est moi le responsable.",
  LR129: "Vouloir du pouvoir juste pour imposer mes goûts aux autres.",
  LR130: "Refuser de mener quand un groupe compte sur moi et que j'en suis capable.",

  // Courage, prudence et protection
  LR131: "Mettre les autres en danger pour montrer que je n'ai pas peur.",
  LR132: "Faire courir un risque à quelqu'un pour un petit avantage.",
  LR133: "Ignorer un danger connu quand d'autres dépendent de ma décision.",
  LR134: "Ne jamais rien tenter par peur, même quand il faut protéger ce qui compte.",
  LR135: "Décider sur un coup de tête une chose que d'autres vont payer.",
  LR136: "Cacher un danger à ceux qui vont s'y exposer.",
  LR137: "Demander aux autres un risque que je refuse de prendre.",
  LR138: "Risquer la sécurité de quelqu'un pour éviter un petit dérangement.",
  LR139: "Me servir de la sécurité comme prétexte pour tout contrôler.",
  LR140: "Refuser toute précaution parce qu'elle me gêne un peu.",

  // Travail, contribution et mérite
  LR141: "Laisser les autres faire ma part et réclamer le même mérite.",
  LR142: "Nuire au travail de quelqu'un pour mieux réussir.",
  LR143: "Cacher une grosse erreur qui peut retomber sur les autres.",
  LR144: "Exiger l'impossible de quelqu'un juste pour montrer qui décide.",
  LR145: "Penser que quelqu'un vaut moins parce qu'il rapporte moins.",
  LR146: "Ne pas reconnaître une bonne idée parce qu'elle vient d'en bas.",
  LR147: "Sacrifier les gens autour de moi pour de meilleurs résultats.",
  LR148: "Bâcler le travail pour éviter toute chicane.",
  LR149: "Accepter un mérite que je sais ne pas avoir gagné.",
  LR150: "Juger la valeur d'une personne à sa seule réussite.",

  // Identité, authenticité et appartenance
  LR151: "Jouer un personnage pour être accepté.",
  LR152: "Renoncer à une part de qui je suis pour éviter le jugement.",
  LR153: "Ne rien changer à ma façon d'être même quand elle complique la vie des autres.",
  LR154: "Demander à quelqu'un de cacher qui il est pour entrer dans mon groupe.",
  LR155: "Supposer ce que quelqu'un pense à cause du groupe d'où il vient.",
  LR156: "Renier mon groupe parce qu'il n'est pas bien vu.",
  LR157: "Rester fidèle à mon groupe quand il me demande une chose que je trouve inacceptable.",
  LR158: "Exclure quelqu'un qui ne suit pas une coutume sans importance.",
  LR159: "Me cacher derrière mon groupe pour ne jamais me remettre en question.",
  LR160: "Couper tous mes liens pour être totalement indépendant.",

  // Hospitalité, accueil et frontières du groupe
  LR161: "Refuser d'accueillir quelqu'un dans le besoin quand ça ne me coûte presque rien.",
  LR162: "Mettre en danger ceux dont je réponds pour accueillir un inconnu.",
  LR163: "Profiter de l'accueil de quelqu'un sans respecter sa maison.",
  LR164: "Traiter un invité de haut parce qu'il dépend de moi pour l'instant.",
  LR165: "Fermer la porte aux nouveaux pour que le groupe reste pareil.",
  LR166: "Tout changer dans le groupe à chaque nouvelle arrivée.",
  LR167: "Fermer l'accès à ce qui est à tous parce que quelqu'un vient d'ailleurs.",
  LR168: "Accueillir quelqu'un sans écouter les inquiétudes de ceux qui sont là.",
  LR169: "Juger quelqu'un selon l'accueil que mon groupe lui a réservé.",
  LR170: "Voir toute personne de l'extérieur comme une menace.",

  // Respect des ancêtres, héritage et changement
  LR171: "Mépriser ce qu'on m'a transmis sans chercher à le comprendre.",
  LR172: "Garder une vieille décision parce que personne n'a osé la changer.",
  LR173: "Changer en profondeur un héritage commun sans demander à ceux qui y tiennent.",
  LR174: "Empêcher une tradition d'évoluer au nom du respect.",
  LR175: "Effacer les récits d'avant parce qu'ils ne nous ressemblent plus.",
  LR176: "Raconter le passé plus beau qu'il était pour protéger l'image du groupe.",
  LR177: "Juger les gens d'avant avec les yeux d'aujourd'hui, sans chercher à comprendre.",
  LR178: "Me servir du respect des ancêtres pour empêcher quelqu'un de choisir sa voie.",
  LR179: "Ne pas transmettre ce que je sais pour rester le seul à le savoir.",
  LR180: "Transmettre une pratique sans laisser les suivants décider quoi en faire.",

  // Savoir, apprentissage et expertise
  LR181: "Refuser de changer d'idée devant des preuves solides, par orgueil.",
  LR182: "Croire quelque chose juste parce que c'est quelqu'un d'important qui l'a dit.",
  LR183: "Rejeter ce que quelqu'un a vécu parce qu'il ne le dit pas dans les bons mots.",
  LR184: "Rejeter la science seulement quand elle contredit ce que j'aimerais croire.",
  LR185: "Décider qu'un savoir ancien ne vaut rien parce qu'il n'est pas scientifique.",
  LR186: "Décider qu'un savoir est vrai parce qu'il est ancien.",
  LR187: "Cacher ce que je sais pour garder une longueur d'avance.",
  LR188: "Donner un conseil sûr de moi sur un sujet que je ne maîtrise pas.",
  LR189: "Refuser d'apprendre de quelqu'un que je juge en dessous de moi.",
  LR190: "Imposer ma lecture d'une situation qui peut se comprendre autrement.",

  // Propriété, partage et biens communs
  LR191: "Prendre ce qui est à quelqu'un parce que j'en ai plus besoin que lui.",
  LR192: "Garder inutilisé ce dont quelqu'un a un besoin urgent.",
  LR193: "Traiter ce qui est à tous comme si c'était à moi.",
  LR194: "Me servir d'un bien commun sans jamais aider à l'entretenir.",
  LR195: "Exiger que quelqu'un partage parce que je juge son besoin moins grand.",
  LR196: "Mettre de côté ce qui est rare pour le revendre plus cher à ceux qui en ont besoin.",
  LR197: "Interdire à chacun d'avoir quelque chose à soi, au nom de tous.",
  LR198: "M'approprier ce dont toute une communauté dépend depuis toujours.",
  LR199: "Gaspiller une chose parce que je l'ai payée.",
  LR200: "Décider de ce qui est à tous sans demander à ceux qui en dépendent.",

  // Réputation, honneur et face
  LR201: "Démolir la réputation de quelqu'un pour en tirer un avantage.",
  LR202: "Laisser quelqu'un porter la honte d'une erreur que j'ai faite.",
  LR203: "Protéger mon image en cachant une faute qui touche les autres.",
  LR204: "Étaler en public une petite erreur qu'on pouvait régler à deux.",
  LR205: "Ne pas signaler une faute grave pour ne pas faire honte à quelqu'un.",
  LR206: "Exiger des excuses publiques juste pour humilier.",
  LR207: "Refuser de m'excuser parce que ça me ferait perdre du galon.",
  LR208: "Faire passer l'honneur du groupe avant ce qui s'est vraiment passé.",
  LR209: "Salir mon propre groupe pour être bien vu ailleurs.",
  LR210: "Défendre l'honneur des miens en attaquant quelqu'un qui n'y est pour rien.",

  // Pardon, réparation et conséquences
  LR211: "Ne jamais pardonner, quoi que la personne fasse pour réparer.",
  LR212: "Pardonner tout de suite une faute grave sans penser à ceux qui l'ont subie.",
  LR213: "Vouloir punir encore quelqu'un qui a déjà tout réparé.",
  LR214: "Ne rien exiger de quelqu'un juste parce qu'il est proche de moi.",
  LR215: "Ressortir sans arrêt une vieille erreur pour garder le contrôle.",
  LR216: "Faire comme si de rien n'était alors que le tort n'a jamais été reconnu.",
  LR217: "Réclamer le pardon de quelqu'un qui n'est pas encore prêt.",
  LR218: "Refuser de me réconcilier pour continuer d'avoir raison.",
  LR219: "Croire que pardonner oblige à revenir exactement comme avant.",
  LR220: "Décider que quelqu'un ne changera jamais à cause d'une vieille faute.",

  // Individu et collectivité
  LR221: "Sacrifier une personne innocente parce que la majorité y gagnerait un peu.",
  LR222: "Refuser un petit effort qui éviterait un gros problème à tout le monde.",
  LR223: "Faire passer l'avis du plus grand nombre avant les droits d'une minorité.",
  LR224: "Laisser quelques personnes bloquer sans fin toute décision commune.",
  LR225: "Demander à quelqu'un de s'effacer sans arrêt « pour le bien du groupe ».",
  LR226: "Ne jamais rien céder au groupe, au nom de mon indépendance.",
  LR227: "Croire qu'un besoin personnel est forcément égoïste.",
  LR228: "Croire qu'une obligation commune est forcément une atteinte à ma liberté.",
  LR229: "Décider pour tout le monde sans écouter ceux que ça touche.",
  LR230: "Abandonner une décision nécessaire parce que tout le monde n'est pas d'accord.",

  // Temps, rythme et obligations
  LR231: "Faire attendre les autres comme si leur temps ne comptait pas.",
  LR232: "Exiger que tout le monde vive au même rythme que moi.",
  LR233: "Sacrifier tout mon temps avec les autres pour en faire plus.",
  LR234: "Laisser tomber mes responsabilités pour garder mon temps à moi.",
  LR235: "Trouver le repos inutile tant qu'on peut encore produire.",
  LR236: "Ignorer une urgence collective parce qu'elle dérange mes plans.",
  LR237: "Mettre tout le monde en urgence parce que je m'y prends mal.",
  LR238: "Repousser sans fin une décision pour éviter la chicane.",
  LR239: "Décider vite juste parce que l'attente me rend mal à l'aise.",
  LR240: "Croire qu'aller vite compte plus que demander leur avis aux autres.",

  // Humains, autres êtres vivants et interdépendance
  LR241: "Faire souffrir un animal pour m'amuser.",
  LR242: "Faire passer les animaux avant des gens dont je suis responsable.",
  LR243: "Détruire une forme de vie parce que je ne lui vois pas d'utilité.",
  LR244: "Refuser toute intervention humaine, même celle qui réparerait nos dégâts.",
  LR245: "Bouleverser un milieu vivant sans chercher à savoir ce que ça provoque.",
  LR246: "Croire que nos besoins justifient n'importe quoi envers le vivant.",
  LR247: "Croire que nos besoins ne justifient jamais rien envers le vivant.",
  LR248: "Épuiser ce dont une communauté vit sans penser au renouvellement.",
  LR249: "Empêcher une communauté de vivre avec la nature comme elle le fait depuis toujours.",
  LR250: "Garder une pratique qui menace maintenant la survie d'une espèce.",

  // ── Horizons ──────────────────────────────────────────────────────────────
  // Les horizons étaient déjà courts et concrets pour la plupart : seuls les
  // libellés à vocabulaire adulte ou administratif sont repris ici. Ceux qui
  // se lisaient déjà d'un coup gardent leur formulation d'origine.

  H002: "Ne dépendre de personne pour l'argent.",
  H004: "Avoir du temps dont personne d'autre ne décide.",
  H006: "N'avoir aucune grosse obligation.",
  H008: "Pouvoir partir de n'importe quelle situation si je le décide.",
  H011: "Ne travailler que quand j'en ai envie.",
  H012: "Avoir assez pour ne jamais avoir à me contenter de moins.",

  H017: "Avoir assez d'argent pour arrêter de calculer.",
  H023: "Que personne ne puisse tout changer sans moi.",

  H037: "Être celui vers qui on va quand ça va mal.",
  H044: "Être entouré de gens qui voient le monde comme moi.",
  H045: "Être accepté même quand je ne rentre pas dans le moule.",

  H058: "Recevoir des marques de reconnaissance qui se voient.",
  H060: "Avoir assez de poids pour que mon avis compte plus.",

  H063: "Donner la direction plutôt que de la suivre.",
  H067: "Avoir assez de place pour qu'on ne puisse pas m'ignorer.",
  H070: "Ne jamais dépendre des décisions de quelqu'un d'autre.",
  H071: "Poser mes limites sans qu'on discute.",
  H072: "Avoir du monde qui embarque naturellement dans mes idées.",
  H074: "Avoir assez de pouvoir pour que certaines choses ne m'arrivent pas.",

  H084: "Aller plus loin que personne dans ma famille avant moi.",
  H086: "Devenir la personne qu'on cite en exemple.",
  H089: "Qu'on ne me trouve plus jamais ordinaire.",

  H098: "Mettre assez de côté pour ceux qui viendront après.",
  H101: "Habiter dans un endroit vraiment confortable.",
  H102: "Voyager sans jamais avoir à me priver.",
  H103: "Avoir plus d'argent que ceux à qui je me compare.",

  H111: "Vivre bien sans me forcer pour rien.",
  H112: "Pouvoir me faire plaisir tout de suite.",
  H114: "Ne plus avoir à endurer ce qui me déplaît.",
  H119: "Ne pas avoir à sacrifier le plaisir pour en faire plus.",

  H123: "Qu'on arrête de me demander des choses sans arrêt.",
  H126: "Avoir peu de choses à faire avec du monde.",
  H129: "Pouvoir me taire sans avoir à amuser les autres.",
  H132: "Pouvoir passer inaperçu quand je le veux.",
  H134: "Avoir assez d'espace à moi pour ne pas céder tout le temps.",
  H135: "Pouvoir disparaître des radars.",

  H137: "Être un parent dont les enfants gardent un bon souvenir.",
  H144: "Qu'un jour, on vienne me demander conseil.",
  H141: "Que ceux qui viendront après moi vivent mieux que moi.",
  H145: "Que mes enfants gardent une bonne part de ce que je crois.",
  H146: "Que mes enfants deviennent très différents de moi, s'ils le veulent.",
  H148: "Bâtir quelque chose qui durera après nous.",
  H150: "Être celui qui change le cours de sa famille.",

  H153: "Ne jamais faire honte à ma famille ou à mon groupe.",
  H154: "Qu'on me voie comme quelqu'un de bien.",
  H156: "Être parfaitement à ma place là où je vis.",
  H157: "Ne jamais rien faire qui ferait mal parler de moi.",
  H158: "Être entouré de gens qui évitent la chicane.",
  H160: "Être vu comme quelqu'un de bien selon les codes de mon milieu.",

  H162: "Refuser de vivre comme tout le monde.",
  H165: "Déranger un peu ce qu'on attend de moi.",
  H167: "Montrer qu'on peut se passer de certaines règles.",
  H169: "Être connu comme quelqu'un qui ne suit pas la gang.",
  H170: "Ne jamais devenir complètement prévisible.",

  H179: "Changer quelque chose pour vrai dans le monde.",
  H185: "Être utile au point qu'on ait du mal à me remplacer.",

  H190: "Avoir assez de poids pour changer les grandes règles.",
  H191: "Voir disparaître pour de bon certaines façons de faire injustes.",
  H192: "Protéger ce qui tient la société debout.",
  H194: "Vivre là où on regarde chaque cas, plutôt que d'appliquer pareil à tous.",

  H200: "Pouvoir vivre de la terre et de ce qu'il y a autour.",
  H202: "Connaître par cœur les saisons, les plantes et les bêtes d'ici.",
  H203: "Laisser certains endroits complètement tranquilles.",
  H204: "Vivre d'un territoire sans l'épuiser.",

  H210: "Devenir vraiment bon dans plusieurs domaines.",
  H215: "En savoir assez pour qu'on ne puisse pas me raconter n'importe quoi.",

  H219: "Vivre d'accord avec ce que je crois vraiment.",
  H222: "Trouver quelque chose qui me guide : une croyance, une façon de vivre.",
  H223: "N'avoir aucune croyance imposée par personne.",
  H224: "Transmettre une façon de voir le monde à ceux qui suivent.",

  H226: "Être meilleur que ceux de mon âge.",
  H230: "Avoir plus de poids que ceux à qui je me mesure.",
  H233: "Ne plus jamais être celui d'en dessous.",
  H234: "Devenir assez fort pour que ceux qui m'ont méprisé n'aient plus le choix.",

  H239: "Avoir une vie où peu de choses reposent sur moi.",
  H241: "Faire partie d'un groupe sans avoir à y tenir un grand rôle.",

  H250: "Être celui dont l'avis compte le plus pour quelqu'un.",
  H251: "Peser fort sur les décisions de mes proches.",
  H253: "Être admiré par des plus jeunes que moi.",
  H254: "Être vu comme le pilier de ma famille ou de mon groupe.",
  H255: "Sentir que si je n'étais pas là, ça se verrait.",

  H258: "Pouvoir recommencer ailleurs sans traîner mon passé.",
  H259: "Pouvoir être quelqu'un de différent selon l'endroit.",
  H260: "Ne jamais être exposé en public sans l'avoir voulu.",
  H261: "Décider de ce qu'on dit de moi.",
  H263: "Garder une part de moi que même mes proches ne connaissent pas.",
  H265: "Pouvoir changer sans avoir à expliquer qui j'étais avant.",

  H266: "Qu'on parle encore de moi longtemps après.",
  H269: "Laisser un projet qui continuera sans moi.",
  H271: "Devenir celui dont les suivants parleront comme d'un point de départ.",
  H272: "Laisser quelque chose de solide à ceux qui suivent.",
  H273: "Transmettre ce que je sais plutôt que ce que j'ai.",

  // ── Trésors ───────────────────────────────────────────────────────────────
  // Le lot le plus marqué : « mon partenaire », « mon revenu », « mes
  // collègues », « mon patrimoine ». Un trésor est ce qu'on a déjà et qu'on ne
  // veut pas perdre — à 13 ans, ce n'est pas une carrière. On garde la tension
  // de la catégorie et on la ramène sur ce qu'une personne de cet âge détient
  // vraiment : ce qu'elle sait faire, son coin, son monde, son temps.

  T001: "La confiance de la personne la plus proche de moi.",
  T002: "Une relation où je peux être complètement moi-même.",
  T003: "L'affection de ceux dont je prends soin.",
  T012: "Pouvoir être seul sans perdre mes amis.",
  T014: "La proximité avec toute ma parenté.",

  T017: "La maison qu'on s'est faite.",
  T019: "La relation que j'ai avec mes frères et sœurs.",
  T020: "Le respect des plus jeunes de ma famille.",
  T023: "Pouvoir prendre soin de ceux qui comptent sur moi.",
  T025: "Les objets qui passent de génération en génération chez nous.",
  T028: "Pouvoir vivre autrement que ma famille sans perdre son affection.",
  T029: "Pouvoir transmettre ce que je crois à ceux qui viendront après.",

  T032: "Pouvoir choisir mes projets.",
  T037: "Pouvoir quitter une situation qui ne me convient plus.",
  T038: "L'argent que je gagne moi-même.",
  T039: "Pouvoir prendre moi-même mes décisions importantes.",
  T043: "Pouvoir changer complètement de direction.",

  T046: "De l'argent qui rentre régulièrement.",
  T047: "Savoir que l'essentiel sera toujours payé.",
  T051: "Un montant mis de côté pour les imprévus.",
  T054: "Un emploi qui ne va pas disparaître.",
  T056: "Le fait que mon entourage ne change pas tout le temps.",
  T058: "Pouvoir encaisser un imprévu sans tout perdre.",
  T059: "Le sentiment d'avoir une prise sur ma vie.",
  T060: "Le fait de savoir à quoi m'attendre avec mes proches.",

  T066: "Le calme chez moi.",
  T068: "Pouvoir partir quelque part de temps en temps.",
  T074: "L'espace que j'ai à moi.",
  T075: "Le fait que mon quotidien soit simple.",

  T077: "Tout ce que je sais faire dans mon métier.",
  T078: "La reconnaissance que j'ai gagnée pour mon travail.",
  T079: "La confiance de ceux avec qui je travaille.",
  T080: "Le fait qu'on me laisse faire mon travail à ma façon.",
  T081: "Les responsabilités qu'on m'a confiées.",
  T084: "Ce que je fais et qui dit une bonne partie de qui je suis.",
  T085: "Pouvoir faire un travail dont je suis fier.",
  T086: "Le fait qu'on me laisse aller sans me surveiller.",
  T087: "Le fait d'apprendre encore en le faisant.",
  T088: "Un rôle que personne ne remplirait aussi bien.",
  T089: "Le monde que je connais et qui me connaît.",

  T099: "Une place qui m'ouvre des portes.",
  T100: "Le prestige qui vient avec ce que je fais.",
  T102: "L'avance que me donne ce que je sais faire.",
  T103: "Le fait d'être écouté avant les autres.",
  T104: "Le respect qui vient avec l'expérience.",

  T108: "Pouvoir défendre ce qui est à moi.",
  T109: "Pouvoir décider de l'usage de certaines choses.",
  T110: "Le fait d'être celui à qui on se réfère.",
  T112: "Pouvoir discuter d'égal à égal.",
  T113: "Pouvoir dire non sans que ça me coûte cher.",
  T114: "Pouvoir vraiment défendre mes proches.",
  T115: "Avoir la main sur ce qui se passe autour de moi.",
  T117: "Pouvoir joindre vite ceux qui décident.",
  T118: "Le fait de ne dépendre de personne de plus fort que moi.",
  T119: "La marge que je me suis gagnée avec le temps.",

  T123: "Ce que je suis, peu importe le regard des autres.",
  T129: "Ce en quoi je crois et qui tient ma vie debout.",

  T139: "Les fêtes et les rituels auxquels je participe.",
  T144: "Le souvenir de ce que mon groupe a traversé.",
  T147: "Le fait que mon monde décide pour lui-même.",
  T150: "Que les jeunes puissent changer ces traditions sans les perdre.",

  T158: "Le fait d'être écouté par mon monde.",
  T159: "Savoir qu'on prendra soin de ceux qui vont mal.",
  T161: "Le fait que mon groupe règle ses problèmes lui-même.",
  T163: "Le sentiment d'être un membre à part entière.",
  T164: "Les coups de main qu'on se donne sans le dire.",

  T168: "L'air, l'eau et la terre d'ici, en bon état.",
  T171: "Pouvoir faire ce qu'on a toujours fait sur ce territoire.",
  T172: "L'accès à ce dont mon monde vit.",
  T174: "Pouvoir laisser cet endroit intact à ceux qui suivent.",
  T176: "Ce que je connais du coin où je vis.",
  T177: "Pouvoir vivre près de l'endroit auquel je tiens.",
  T178: "Les saisons qui rythment ma vie.",
  T180: "Un endroit que nous n'avons pas encore tout transformé.",

  T183: "Ma capacité à démêler des problèmes compliqués.",
  T186: "Pouvoir m'informer librement.",
  T187: "Mes livres et ce que j'ai gardé pour m'y référer.",
  T189: "Pouvoir enseigner ce que je sais.",
  T190: "Le fait qu'on reconnaisse que je m'y connais.",
  T191: "Ma capacité à me débrouiller seul.",
  T193: "Pouvoir entendre plusieurs points de vue.",
  T194: "Ma façon de penser par moi-même.",
  T195: "Pouvoir transmettre ce que je sais avant que ça se perde.",

  T196: "Le sentiment d'agir comme je pense.",
  T199: "Ma réputation d'être quelqu'un de droit.",
  T200: "Pouvoir refuser ce qui va contre ce que je crois.",
  T201: "Quelque chose qui donne un sens à ma vie.",
  T202: "Pouvoir admettre mes erreurs sans me détester.",
  T203: "Le fait de faire ce que je dis.",
  T204: "Pouvoir ne pas penser comme tout le monde autour de moi.",
  T205: "Pouvoir participer aux traditions qui comptent pour moi.",

  T207: "Le fait que mes erreurs d'avant ne disent pas tout de moi.",
  T208: "Pouvoir choisir ce que je montre de moi.",
  T211: "La main sur ce qui traîne de moi en ligne.",
  T213: "Le droit qu'on oublie mes petites erreurs.",
  T214: "Pouvoir être différent selon l'endroit où je suis.",

  T219: "Le matériel dont j'ai besoin pour ce que je fais.",
  T221: "Ce que j'ai accumulé avec le temps.",
  T222: "Pouvoir garder mes affaires sans devoir les partager.",
  T223: "Pouvoir partager mes affaires avec qui je veux.",
  T224: "Un endroit qui vient de ma famille.",
  T225: "Pouvoir laisser quelque chose de concret à ceux qui suivent.",

  T227: "Les avantages qui viennent avec ma place.",
  T228: "Le fait d'avoir plus de choix que bien d'autres.",
  T229: "Les faveurs que mon expérience me vaut.",
  T230: "Pouvoir éviter les tâches dont je ne veux plus.",
  T231: "Le respect qui vient tout seul avec mon titre.",
  T232: "Pouvoir payer pour gagner du temps.",
  T233: "Ne plus avoir à prouver sans arrêt ce que je vaux.",
  T234: "Mon accès à des choses et à du monde que d'autres n'ont pas.",
  T235: "Pouvoir confier certaines tâches à d'autres.",
  T236: "Pouvoir choisir entre plusieurs bonnes options.",
  T237: "La sécurité que me donne ma place.",
  T238: "Le fait que mon avis pèse plus qu'avant.",
  T239: "Pouvoir refuser n'importe quel travail.",
  T240: "Le coussin que je me suis fait avec les années.",

  T243: "Mes fins de semaine sans rien à faire.",
  T244: "Pouvoir aller à mon rythme.",
  T245: "Pouvoir prendre une pause quand j'en ai besoin.",
  T247: "Pouvoir ne pas être joignable tout le temps.",
  T249: "Une vraie frontière entre ce que je dois faire et ma vie à moi.",
  T250: "Des journées sans programme.",

  T253: "Une relation sans chicane constante.",
  T254: "Pouvoir éviter les affrontements inutiles.",
  T256: "Ma réputation d'être quelqu'un d'accommodant.",
  T257: "Un endroit où on peut être en désaccord sans s'insulter.",
  T258: "Pouvoir vivre sans devoir choisir un camp.",
  T260: "Une vie sans drames à répétition.",

  T263: "Pouvoir essayer sans avoir à me justifier.",
  T264: "Ce que j'ai créé.",
  T265: "Ma façon de trouver des solutions neuves.",
  T267: "Pouvoir continuer une passion qui ne rapporte rien.",
  T270: "Pouvoir montrer ce que je fais.",

  T273: "Le fait d'être celui qui trouve souvent la solution.",
  T274: "Pouvoir aider pour vrai.",
  T276: "Ma place de personne à qui on se fie dans le groupe.",
  T277: "Pouvoir transmettre ce que je sais.",
  T278: "Le sentiment d'apporter ce que personne d'autre n'apporte.",
  T280: "Le fait que si je n'étais pas là, ça se verrait.",

  T281: "Le sentiment d'avoir encore plusieurs chemins devant moi.",
  T286: "De quoi saisir une occasion qui arrive sans prévenir.",
  T287: "Le droit de me tromper sans que ce soit définitif.",
  T289: "Pouvoir prendre des risques sans tout mettre en jeu.",

  T291: "Des institutions à qui je peux faire confiance.",
  T293: "Pouvoir contester une décision, avec une marche à suivre claire.",
  T294: "Des droits protégés même quand ils déplaisent.",
  T295: "Des façons de faire communes, qui rendent les autres prévisibles.",
  T296: "Un pays qui ne bascule pas du jour au lendemain.",
  T297: "Que mon groupe garde ses propres règles sur certaines choses.",
  T298: "Des règles assez souples pour tenir compte des cas.",
  T299: "Le sentiment que les grandes décisions ne sont pas prises au hasard.",
  T300: "Pouvoir savoir qui est responsable d'une décision.",
};


