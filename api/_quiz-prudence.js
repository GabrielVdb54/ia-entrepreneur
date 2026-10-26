/**
 * Banque de questions du quiz de la formation « Vente additionnelle »
 * de Prudence Créole (agence Generali, La Réunion), novembre 2026.
 *
 * Fichier de données, lu seulement par api/quiz.js : les bonnes réponses ne
 * quittent jamais le serveur avant que la participante ait envoyé les siennes.
 * Un quiz dont les réponses se lisent dans le code de la page ne départage
 * personne au championnat.
 *
 * Champs : q = question, o = options, a = index de la bonne option (null pour
 * un sondage), e = explication affichée et envoyée avec la correction.
 */

export const FORMATIONS = {
  "prudence-creole": {
    "titre": "Vente additionnelle · Prudence Créole",
    "groupes": {
      "A": "Groupe du matin",
      "B": "Groupe de l’après-midi"
    },
    "activites": {
      "1.1": {
        "seance": 1,
        "seanceTitre": "Séance 1 · Les 3 formes de la vente additionnelle",
        "titre": "Sondage, non noté",
        "sondage": true,
        "intro": null,
        "questions": [
          {
            "q": "Pour moi, proposer un autre contrat à un client, c’est…",
            "o": [
              "Le déranger",
              "Lui rendre service",
              "Faire du commercial, alors que ce n’est pas mon métier",
              "Ça dépend du moment"
            ],
            "a": null,
            "e": "On regarde les résultats ensemble, sans juger."
          }
        ]
      },
      "1.2": {
        "seance": 1,
        "seanceTitre": "Séance 1 · Les 3 formes de la vente additionnelle",
        "titre": "Cross, up ou down ?",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Une cliente assurée en auto chez nous souscrit aussi son habitation.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 0,
            "e": "C’est un contrat différent, qui complète le premier."
          },
          {
            "q": "Un client passe de la formule tiers à la formule tous risques pour sa voiture neuve.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 1,
            "e": "Même contrat, dans une version plus complète."
          },
          {
            "q": "Une cliente veut résilier sa tous risques jugée trop chère. On lui propose un tiers étendu adapté à sa voiture de 12 ans.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 2,
            "e": "Une alternative moins chère qui garde la cliente et la protège."
          },
          {
            "q": "On ajoute l’option véhicule de remplacement au contrat auto d’un client.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 1,
            "e": "Une option sur le même contrat, c’est une montée en gamme."
          },
          {
            "q": "Un artisan assuré chez nous pour son utilitaire souscrit une RC pro.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 0,
            "e": "Un nouveau contrat, complémentaire du premier."
          },
          {
            "q": "Un client hésite devant la formule santé la plus haute. On lui propose la formule intermédiaire, qui couvre l’essentiel.",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 2,
            "e": "Une formule moins chère plutôt qu’un refus."
          }
        ]
      },
      "1.3": {
        "seance": 1,
        "seanceTitre": "Séance 1 · Les 3 formes de la vente additionnelle",
        "titre": "Quiz de fin de séance",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Le cross-selling, c’est :",
            "o": [
              "Proposer une version plus complète du même contrat",
              "Proposer un contrat complémentaire",
              "Proposer une formule moins chère"
            ],
            "a": 1,
            "e": "Exemple : une habitation pour un client assuré en auto."
          },
          {
            "q": "Une cliente trouve son contrat trop cher et parle de partir. La meilleure réaction :",
            "o": [
              "La laisser partir, c’est son choix",
              "Lui proposer tout de suite un contrat en plus",
              "Comprendre son besoin et proposer une formule adaptée, en expliquant ce qui change"
            ],
            "a": 2,
            "e": "C’est le down-selling : on garde la cliente, et on reste dans le devoir de conseil."
          },
          {
            "q": "Lequel de ces éléments est un événement de vie qui crée un besoin ?",
            "o": [
              "Le client paie par chèque",
              "Le fils du client passe son permis",
              "Le client arrive en avance"
            ],
            "a": 1,
            "e": "Un jeune conducteur à déclarer, et des garanties à revoir."
          },
          {
            "q": "Un client vient se plaindre d’un sinistre mal géré. Que faites-vous en premier ?",
            "o": [
              "J’en profite pour lui proposer une option",
              "J’écoute et je règle son problème",
              "Je lui donne le numéro du siège"
            ],
            "a": 1,
            "e": "On ne vend jamais à un client mécontent : on règle d’abord son problème."
          },
          {
            "q": "Pourquoi la vente additionnelle fait-elle partie de notre métier ?",
            "o": [
              "Le devoir de conseil impose de proposer un contrat adapté aux besoins du client",
              "Parce que l’agence a des objectifs",
              "Parce que tous les clients l’attendent"
            ],
            "a": 0,
            "e": "Repérer un risque et ne pas en parler, c’est mal conseiller."
          }
        ]
      },
      "2.1": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Questionner pour découvrir les besoins",
        "titre": "Rappel de la séance 1",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Proposer une formule tous risques à la place d’un tiers, c’est :",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 1,
            "e": "Même contrat, version plus complète."
          },
          {
            "q": "Un client vous dit qu’il vient de se marier. C’est :",
            "o": [
              "Une information privée sans intérêt",
              "Un événement de vie qui peut créer un besoin",
              "Une objection"
            ],
            "a": 1,
            "e": "Un mariage change souvent la situation : logement, véhicules, protection de la famille."
          },
          {
            "q": "Proposer une formule moins chère à une cliente qui veut résilier, c’est :",
            "o": [
              "Une erreur",
              "Du cross-selling",
              "Du down-selling"
            ],
            "a": 2,
            "e": "On la garde, et on explique ce qui change."
          }
        ]
      },
      "2.2": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Questionner pour découvrir les besoins",
        "titre": "Ouverte, fermée ou alternative ?",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "« Vous êtes toujours à Saint-André ? »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 1,
            "e": "Réponse par oui ou non : elle sert à vérifier un fait."
          },
          {
            "q": "« Comment utilisez-vous votre voiture en semaine ? »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 0,
            "e": "Elle fait parler le client."
          },
          {
            "q": "« Qu’est-ce qui compte le plus pour vous dans un contrat habitation ? »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 0,
            "e": "Elle fait émerger ses priorités."
          },
          {
            "q": "« On se rappelle plutôt mardi ou jeudi ? »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 2,
            "e": "Elle fait choisir entre deux options, pour conclure."
          },
          {
            "q": "« Vous avez déjà eu un sinistre ? »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 1,
            "e": "Version ouverte : « Qu’est-ce qui vous est arrivé ces dernières années, côté voiture ou maison ? »"
          },
          {
            "q": "« Racontez-moi votre projet de local. »",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 0,
            "e": "Une invitation à parler, même sans point d’interrogation."
          }
        ]
      },
      "2.3": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Questionner pour découvrir les besoins",
        "titre": "Quelle étape SPID ?",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "« Combien de personnes vivent avec vous ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 0,
            "e": "Un fait sur la situation du client."
          },
          {
            "q": "« Qu’est-ce qui vous inquiète le plus si vous avez un accident ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 1,
            "e": "On cherche ce qui préoccupe le client."
          },
          {
            "q": "« Sans votre utilitaire, combien de chantiers seriez-vous obligé de reporter ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 2,
            "e": "Le client mesure les conséquences concrètes."
          },
          {
            "q": "« Qu’est-ce qui vous rassurerait pour votre famille ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 3,
            "e": "Le client décrit la solution idéale."
          },
          {
            "q": "« Depuis quand avez-vous votre atelier ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 0,
            "e": "Un fait sur la situation."
          },
          {
            "q": "« Si votre local brûle, comment payez-vous vos salariés pendant les travaux ? »",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 2,
            "e": "Une conséquence concrète, chiffrable."
          }
        ]
      },
      "2.4": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Questionner pour découvrir les besoins",
        "titre": "Quiz de fin de séance",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Quelle question fait le plus parler le client ?",
            "o": [
              "« Vous avez des enfants ? »",
              "« Comment se compose votre famille aujourd’hui ? »",
              "« Vous avez combien d’enfants ? »"
            ],
            "a": 1,
            "e": "Une question ouverte appelle une vraie réponse."
          },
          {
            "q": "À quoi sert une question fermée ?",
            "o": [
              "À découvrir les besoins",
              "À valider ou conclure",
              "À rien, il faut l’éviter"
            ],
            "a": 1,
            "e": "On la garde pour la fin de l’entonnoir."
          },
          {
            "q": "Dans SPID, l’étape Implication sert à :",
            "o": [
              "Connaître la situation du client",
              "Faire mesurer au client les conséquences concrètes d’un risque",
              "Annoncer le prix"
            ],
            "a": 1,
            "e": "C’est le client qui mesure le risque, sans qu’on dramatise."
          },
          {
            "q": "À la fin de la découverte, qui doit exprimer le besoin ?",
            "o": [
              "La conseillère",
              "Le client",
              "Le siège"
            ],
            "a": 1,
            "e": "Un client accepte ce qu’il a lui-même exprimé."
          },
          {
            "q": "Reformuler, c’est :",
            "o": [
              "Répéter mot pour mot",
              "Résumer ce que le client a dit pour vérifier qu’on a compris",
              "Donner son avis"
            ],
            "a": 1,
            "e": "« Si je résume, ce qui compte pour vous, c’est… C’est bien ça ? »"
          }
        ]
      },
      "3.1": {
        "seance": 3,
        "seanceTitre": "Séance 3 · Argumenter et répondre aux objections",
        "titre": "Rappel de la séance 2",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "« Qu’est-ce qui vous inquiéterait le plus si… ? » correspond à l’étape :",
            "o": [
              "S · Situation actuelle",
              "P · Préoccupation",
              "I · Implication",
              "D · Désir"
            ],
            "a": 1,
            "e": "On cherche la préoccupation."
          },
          {
            "q": "La question « Vous avez une mutuelle ? » est :",
            "o": [
              "Ouverte",
              "Fermée",
              "Alternative"
            ],
            "a": 1,
            "e": "Version ouverte : « Comment êtes-vous couverte pour la santé aujourd’hui ? »"
          },
          {
            "q": "Dans SPID, qui formule le désir ?",
            "o": [
              "Le client",
              "La conseillère"
            ],
            "a": 0,
            "e": "On attend que le client décrive la solution, puis on reformule."
          }
        ]
      },
      "3.2": {
        "seance": 3,
        "seanceTitre": "Séance 3 · Argumenter et répondre aux objections",
        "titre": "Quel levier ?",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "« Je veux surtout être tranquille si ma fille a un accident. »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 0,
            "e": "La peur du risque : Sécurité."
          },
          {
            "q": "« Je n’ai pas envie de courir partout. Si je peux tout avoir chez vous… »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 3,
            "e": "La simplicité : Confort."
          },
          {
            "q": "« Ça fait 15 ans que je viens ici, je vous fais confiance. »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 5,
            "e": "La relation : Sympathie."
          },
          {
            "q": "« Combien ça me coûte en plus par mois ? »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 4,
            "e": "Le budget : Argent."
          },
          {
            "q": "« Ma voiture, c’est ma fierté. Je veux la meilleure couverture. »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 1,
            "e": "Le désir du meilleur : Orgueil."
          },
          {
            "q": "« Il y a de nouvelles garanties depuis l’an dernier ? »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 2,
            "e": "L’intérêt pour ce qui est nouveau : Nouveauté."
          },
          {
            "q": "« Je viens de passer à l’électrique pour moins polluer, ça change quelque chose ? »",
            "o": [
              "Sécurité",
              "Orgueil",
              "Nouveauté",
              "Confort",
              "Argent",
              "Sympathie",
              "Environnement"
            ],
            "a": 6,
            "e": "L’écologie : Environnement."
          }
        ]
      },
      "3.3": {
        "seance": 3,
        "seanceTitre": "Séance 3 · Argumenter et répondre aux objections",
        "titre": "C, A, P ou B ?",
        "sondage": false,
        "intro": "Les phrases d’un argument pour Mme Hoarau, sur la garantie accidents de la vie.",
        "questions": [
          {
            "q": "« La garantie accidents de la vie couvre les accidents de la vie privée : une chute, du bricolage, le sport. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 0,
            "e": "Ce qu’est la garantie."
          },
          {
            "q": "« Elle vous indemnise si vous êtes blessée et gardez des séquelles. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 1,
            "e": "Ce qu’elle permet, pour tout le monde."
          },
          {
            "q": "« C’est écrit dans les conditions, je vous montre le tableau des garanties. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 2,
            "e": "Ce qui le démontre."
          },
          {
            "q": "« Si votre mari se blesse à nouveau, vous n’aurez pas à toucher à l’argent de la maison. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 3,
            "e": "Ce que ça change pour cette cliente, avec ses mots."
          },
          {
            "q": "« Un de nos clients a été indemnisé après une mauvaise chute dans son jardin. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 2,
            "e": "Un cas vécu, anonymisé."
          },
          {
            "q": "« Vous êtes tranquille : vos enfants et votre maison sont protégés. »",
            "o": [
              "C · Caractéristique",
              "A · Avantage",
              "P · Preuve",
              "B · Bénéfice"
            ],
            "a": 3,
            "e": "Le bénéfice relié à son levier, la Sécurité."
          }
        ]
      },
      "3.4": {
        "seance": 3,
        "seanceTitre": "Séance 3 · Argumenter et répondre aux objections",
        "titre": "Quiz de fin de séance",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Un client dit : « Je n’ai pas le temps de m’occuper de ça. » Quel levier ?",
            "o": [
              "Confort",
              "Orgueil",
              "Nouveauté"
            ],
            "a": 0,
            "e": "On lui propose de tout préparer pour lui."
          },
          {
            "q": "Dans CAPB, le bénéfice, c’est :",
            "o": [
              "Ce que fait la garantie",
              "Ce que ça change concrètement pour ce client",
              "Le prix"
            ],
            "a": 1,
            "e": "Il reprend les mots entendus pendant la découverte."
          },
          {
            "q": "Face à « C’est trop cher », la première chose à faire :",
            "o": [
              "Baisser le prix",
              "Accueillir, puis poser une question pour comprendre",
              "Expliquer qu’on ne peut rien faire"
            ],
            "a": 1,
            "e": "Accueillir, questionner, répondre, vérifier."
          },
          {
            "q": "Le down-selling est une bonne solution quand :",
            "o": [
              "Le client hésite ou veut partir à cause du prix",
              "Le client est très satisfait",
              "On veut augmenter le panier"
            ],
            "a": 0,
            "e": "Mieux vaut un client couvert qu’un client parti."
          },
          {
            "q": "Quand on propose une formule moins complète, on doit :",
            "o": [
              "Expliquer ce qui change et le noter dans le dossier",
              "Ne rien dire pour ne pas l’inquiéter",
              "Attendre que le client le découvre"
            ],
            "a": 0,
            "e": "C’est le devoir de conseil."
          }
        ]
      },
      "4.1": {
        "seance": 4,
        "seanceTitre": "Séance 4 · L’appel bilan et votre trame",
        "titre": "Le sondage de la séance 1, une seconde fois",
        "sondage": true,
        "intro": null,
        "questions": [
          {
            "q": "Pour moi, proposer un autre contrat à un client, c’est…",
            "o": [
              "Le déranger",
              "Lui rendre service",
              "Faire du commercial, alors que ce n’est pas mon métier",
              "Ça dépend du moment"
            ],
            "a": null,
            "e": "On regarde les résultats ensemble, sans juger."
          }
        ]
      },
      "4.2": {
        "seance": 4,
        "seanceTitre": "Séance 4 · L’appel bilan et votre trame",
        "titre": "Rappel de la séance 3",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "« Ma voiture, c’est ma fierté » correspond au levier :",
            "o": [
              "Sécurité",
              "Orgueil",
              "Confort"
            ],
            "a": 1,
            "e": "Le client veut le meilleur."
          },
          {
            "q": "Dans CAPB, « un client a été indemnisé l’an dernier », c’est :",
            "o": [
              "Un avantage",
              "Une preuve",
              "Un bénéfice"
            ],
            "a": 1,
            "e": "Un cas vécu qui démontre."
          },
          {
            "q": "Face à une objection, la deuxième étape est :",
            "o": [
              "Répondre",
              "Questionner",
              "Vérifier"
            ],
            "a": 1,
            "e": "Accueillir, questionner, répondre, vérifier."
          }
        ]
      },
      "4.3": {
        "seance": 4,
        "seanceTitre": "Séance 4 · L’appel bilan et votre trame",
        "titre": "Quiz final sur les 4 séances",
        "sondage": false,
        "intro": null,
        "questions": [
          {
            "q": "Proposer une habitation à un client assuré en auto, c’est :",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 0,
            "e": "Un contrat complémentaire."
          },
          {
            "q": "Ajouter l’option assistance 0 km à un contrat auto, c’est :",
            "o": [
              "Cross-selling",
              "Up-selling",
              "Down-selling"
            ],
            "a": 1,
            "e": "Une option sur le même contrat."
          },
          {
            "q": "Un client vous dit : « Mon fils part étudier en métropole. » C’est :",
            "o": [
              "Un signal à exploiter",
              "Une information privée à ignorer",
              "Une objection"
            ],
            "a": 0,
            "e": "Un événement de vie : logement, santé, véhicule à revoir."
          },
          {
            "q": "Laquelle est une question ouverte ?",
            "o": [
              "« Vous roulez beaucoup ? »",
              "« Comment utilisez-vous votre voiture au quotidien ? »",
              "« Vous préférez mardi ou jeudi ? »"
            ],
            "a": 1,
            "e": "Elle fait parler le client."
          },
          {
            "q": "« Sans revenus pendant 2 mois, comment ça se passe pour le crédit ? » est une question de :",
            "o": [
              "Situation",
              "Préoccupation",
              "Implication"
            ],
            "a": 2,
            "e": "Le client mesure les conséquences."
          },
          {
            "q": "« Je veux que ce soit simple » révèle le levier :",
            "o": [
              "Confort",
              "Orgueil",
              "Nouveauté"
            ],
            "a": 0,
            "e": "On met en avant le seul interlocuteur, tout au même endroit."
          },
          {
            "q": "Dans CAPB, le bénéfice, c’est :",
            "o": [
              "Ce qu’est la garantie",
              "Ce que ça change concrètement pour ce client",
              "La preuve que ça marche"
            ],
            "a": 1,
            "e": "Relié au levier SONCASE du client."
          },
          {
            "q": "Le client dit : « Je vais réfléchir. » La meilleure réponse :",
            "o": [
              "« D’accord, au revoir. »",
              "« Bien sûr. Qu’est-ce qui vous fait hésiter ? », puis un rappel daté",
              "« L’offre n’est valable qu’aujourd’hui. »"
            ],
            "a": 1,
            "e": "On comprend l’hésitation, puis on fixe une prochaine étape."
          },
          {
            "q": "La première étape d’un appel bilan :",
            "o": [
              "Proposer directement un contrat",
              "Se présenter, donner la raison de l’appel et vérifier que c’est le bon moment",
              "Demander une recommandation"
            ],
            "a": 1,
            "e": "L’accroche décide de la suite."
          },
          {
            "q": "Le bon moment pour demander une recommandation :",
            "o": [
              "Quand le client vient de se plaindre",
              "Après un sinistre bien réglé, quand le client remercie",
              "Au milieu d’une objection"
            ],
            "a": 1,
            "e": "Un client satisfait recommande volontiers, si on le lui demande."
          }
        ]
      }
    }
  }
};
