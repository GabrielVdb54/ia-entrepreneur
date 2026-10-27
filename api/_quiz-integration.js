/**
 * Banque de questions du quiz d'intégration de l'équipe commerciale
 * d'IA-Entrepreneur (setter, commerciale), écrit pour l'arrivée d'Anna en
 * novembre 2026.
 *
 * Généré depuis les documents du Drive « IA-Entrepreneur — Intégration
 * Commercial » (process commercial, livret, fiche setter, séquence email,
 * financement) et Goodweek/20-commercial.md, qui fait foi. Quand ces documents
 * changent, ce quiz doit suivre.
 *
 * Fichier de données, lu seulement par api/quiz.js, séparé de
 * _quiz-prudence.js parce que celui-ci est remplacé en bloc quand la formation
 * Prudence Créole évolue. Mêmes champs : q = question, o = options, a = index
 * de la bonne option, e = explication affichée et envoyée avec la correction.
 */

export const FORMATIONS = {
  "integration-commerciale": {
    "titre": "Intégration de l’équipe commerciale · IA-Entrepreneur",
    "groupes": {
      "S": "Setter",
      "C": "Commerciale"
    },
    "activites": {
      "1.1": {
        "seance": 1,
        "seanceTitre": "Séance 1 · L’équipe et les offres",
        "titre": "L’équipe et le parcours client",
        "sondage": false,
        "intro": "À relire : « 00 — Process commercial » et le livret d’intégration, dans le Drive « Intégration Commercial ».",
        "questions": [
          {
            "q": "Ton rôle de setter, c’est :",
            "o": [
              "Poser des rendez-vous qualifiés pour les closers",
              "Vendre la formation dès le premier appel",
              "Préparer la proposition commerciale du prospect"
            ],
            "a": 0,
            "e": "Tu ne vends pas : tu donnes envie d’en parler avec un conseiller, et tu remplis la fiche pour qu’il arrive préparé."
          },
          {
            "q": "Qui monte les propositions commerciales et les programmes ?",
            "o": [
              "Le closer qui a fait la découverte",
              "Cathy, avec le dossier de financement",
              "Gabriel, et lui seul"
            ],
            "a": 2,
            "e": "Gabriel monte toutes les propositions et les programmes, valide les prix et choisit le formateur de chaque mission."
          },
          {
            "q": "Qui sont les closers ?",
            "o": [
              "Dorian, Axel et Karine",
              "Axel et Cathy",
              "Dorian, Axel et Gabriel"
            ],
            "a": 2,
            "e": "Karine pose des rendez-vous, avec les mêmes règles que toi. Cathy monte les dossiers de financement."
          },
          {
            "q": "Que fait Cathy (Adminella) ?",
            "o": [
              "Elle mène les rendez-vous de découverte avec les prospects",
              "Elle choisit le formateur de chaque mission",
              "Elle monte les dossiers de financement (OPCO, FAF) pour viser zéro reste à charge"
            ],
            "a": 2,
            "e": "Elle intervient une fois la proposition validée par le client."
          },
          {
            "q": "Comment un closer est-il attribué à un rendez-vous ?",
            "o": [
              "À tour de rôle, pour que chacun ait autant de rendez-vous",
              "Le Calendly de l’équipe propose un closer disponible, selon les agendas",
              "Tu choisis le closer qui te semble le plus adapté"
            ],
            "a": 1,
            "e": "La répartition suit les disponibilités, pas des parts égales. Tu notes ensuite le closer attribué dans le CRM."
          },
          {
            "q": "Après le rendez-vous de découverte, qu’est-ce qui se passe ?",
            "o": [
              "Cathy dépose tout de suite le dossier de financement",
              "Le closer fait son compte rendu sous 24 h, puis Gabriel envoie proposition et programme sous 48 heures ouvrées",
              "Le formateur appelle le client pour fixer les dates"
            ],
            "a": 1,
            "e": "L’ordre : découverte, compte rendu, proposition et programme, validation par le client, dossier de financement, formation."
          },
          {
            "q": "Quel délai annonce-t-on pour recevoir la proposition ?",
            "o": [
              "48 heures ouvrées après la découverte",
              "24 heures après la découverte",
              "Une semaine après la découverte"
            ],
            "a": 0,
            "e": "Les 24 heures, c’est le délai du compte rendu du closer à Gabriel. On n’annonce jamais d’autre délai que 48 heures ouvrées."
          },
          {
            "q": "Quand le dossier de financement est-il monté ?",
            "o": [
              "Avant le rendez-vous de découverte, pour savoir si le prospect est finançable",
              "Après la formation, avec les feuilles d’émargement",
              "Une fois la proposition validée par le client, et avant le début de la formation"
            ],
            "a": 2,
            "e": "Cathy le dépose avant le début de la formation : au moins 15 jours avant pour un FAF."
          },
          {
            "q": "Le Figaro, pour nous, c’est :",
            "o": [
              "Une référence client que l’on peut citer",
              "Une campagne de publicités Meta",
              "Un article et un partenariat exclusif d’un an, à partir de janvier 2027"
            ],
            "a": 2,
            "e": "Nos autres sources de prospects : les publicités Meta, le site, tes appels et la séquence d’emails à froid."
          }
        ]
      },
      "1.2": {
        "seance": 1,
        "seanceTitre": "Séance 1 · L’équipe et les offres",
        "titre": "Ce qu’on vend",
        "sondage": false,
        "intro": "À relire : « 20-commercial.md » (section 2) dans le dossier Goodweek du Drive, et le catalogue (dossier 01).",
        "questions": [
          {
            "q": "Combien de niveaux de formation propose-t-on aux entreprises ?",
            "o": [
              "2",
              "3",
              "5"
            ],
            "a": 1,
            "e": "Niveau 1 acculturation, niveau 2 IA métier, niveau 3 automatisation et intégration. Ils peuvent s’enchaîner."
          },
          {
            "q": "Le niveau 1, « Montée en compétences / acculturation IA », c’est :",
            "o": [
              "2 à 3 jours sur les logiciels et les process internes de l’entreprise",
              "1 à 2 jours pour comprendre les IA, savoir laquelle sert à quoi et éviter les erreurs",
              "3 à 4 jours pour automatiser des tâches entières"
            ],
            "a": 1,
            "e": "Pour salariés et dirigeants, sans prérequis."
          },
          {
            "q": "Le niveau 2, « IA métier », c’est :",
            "o": [
              "2 à 3 jours, totalement adaptés aux process et aux logiciels internes du client",
              "1 jour de découverte générale de ChatGPT",
              "3 à 4 jours pour construire des agents IA"
            ],
            "a": 0,
            "e": "Ateliers sur les cas réels du client : emails, devis, comptes rendus, reporting, CRM…"
          },
          {
            "q": "Le niveau 3, « Automatisation & intégration », s’adresse surtout à :",
            "o": [
              "Tous les salariés, sans prérequis",
              "Un référent IA ou un profil à l’aise avec le numérique",
              "Les dirigeants qui découvrent l’IA"
            ],
            "a": 1,
            "e": "3 à 4 jours pour automatiser et intégrer soi-même : ils repartent avec au moins une automatisation qui marche sur leur cas."
          },
          {
            "q": "Combien de personnes au maximum dans un groupe ?",
            "o": [
              "8",
              "12",
              "20"
            ],
            "a": 1,
            "e": "Formations intra-entreprise, sur mesure, en présentiel ou à distance. 1 jour = 7 heures."
          },
          {
            "q": "Un prospect te parle d’« IA Essentiel à 800 € », vu sur un ancien support. Tu réponds :",
            "o": [
              "Que cette offre n’existe plus : aujourd’hui, ce sont les 3 niveaux sur mesure, sur devis",
              "Que le prix est passé à 1 000 €",
              "Que c’est maintenant le niveau 1, au même prix"
            ],
            "a": 0,
            "e": "IA Essentiel et IA Pro n’existent plus, à aucun prix. On ne les cite jamais de soi-même."
          },
          {
            "q": "Un indépendant veut se former. Que lui dis-tu ?",
            "o": [
              "Il peut suivre le niveau 1 avec son CPF",
              "Les formations pour indépendants arriveront plus tard : il s’inscrit sur la liste d’attente du site, sans prix",
              "Il peut rejoindre le groupe d’une entreprise cliente"
            ],
            "a": 1,
            "e": "Aucun prix, aucun programme et aucune promesse de financement aux indépendants pour l’instant."
          },
          {
            "q": "Goodweek, c’est :",
            "o": [
              "Une plateforme d’IA pour entreprises, hébergée en France, vendue en licences sur une proposition séparée",
              "Un module inclus dans le niveau 2",
              "Un outil financé par l’OPCO avec la formation"
            ],
            "a": 0,
            "e": "Jamais dans un dossier de financement, jamais conditionné à une formation. Démonstration et essai : uniquement avec Gabriel."
          },
          {
            "q": "Que reçoivent les participants à la fin d’une formation ?",
            "o": [
              "Une certification RS6776 reconnue par l’État",
              "Un diplôme inscrit au Répertoire Spécifique",
              "Une attestation individuelle de formation (AI Act, RGPD, gouvernance, données sensibles)"
            ],
            "a": 2,
            "e": "Et l’entreprise reçoit un registre de conformité AI Act. Ce n’est pas une formation certifiante : Qualiopi certifie l’organisme, pas la formation."
          },
          {
            "q": "Laquelle de ces offres existe toujours ?",
            "o": [
              "L’intégration IA clé en main, sur devis",
              "L’audit IA",
              "Le coaching individuel"
            ],
            "a": 0,
            "e": "L’intégration clé en main (chatbot, automatisations) se remonte à Gabriel. L’audit IA, le coaching individuel et la formation création d’entreprise ne sont plus proposés."
          }
        ]
      },
      "2.1": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Le setting",
        "titre": "L’appel et la prise de rendez-vous",
        "sondage": false,
        "intro": "À relire : la fiche setter (dossier 04 du Drive).",
        "questions": [
          {
            "q": "Comment présentes-tu IA-Entrepreneur dans ton accroche ?",
            "o": [
              "Organisme de formation certifiante, éligible au CPF",
              "Organisme de formation certifié Qualiopi, qui forme les équipes de PME à l’IA sur leurs propres outils",
              "Éditeur de logiciels d’intelligence artificielle"
            ],
            "a": 1,
            "e": "Et tu ajoutes : « On monte le dossier de financement pour viser zéro reste à charge. »"
          },
          {
            "q": "Ton accroche se termine par une question simple. Laquelle ?",
            "o": [
              "« Vous avez un budget formation cette année ? »",
              "« Vous connaissez l’AI Act ? »",
              "« Est-ce que vos équipes utilisent déjà l’IA aujourd’hui ? »"
            ],
            "a": 2,
            "e": "Puis tu écoutes : la suite dépend de sa réponse."
          },
          {
            "q": "Le prospect répond : « Non, pas vraiment. »",
            "o": [
              "« Alors ce n’est sans doute pas le bon moment, je vous rappelle dans six mois. »",
              "« C’est le cas de la plupart des PME. Souvent, certains salariés l’utilisent déjà sans cadre. Un conseiller peut faire le point avec vous en 30 minutes. »",
              "« Attention, avec l’AI Act, vous êtes obligés de former vos équipes. »"
            ],
            "a": 1,
            "e": "Beaucoup de dirigeants pensent ne pas être concernés, alors que l’IA est déjà dans leurs logiciels."
          },
          {
            "q": "Le prospect répond : « Oui, un peu. »",
            "o": [
              "« Sur quels outils ? Et vous avez l’impression d’en tirer vraiment parti ? », puis tu proposes le rendez-vous",
              "Tu lui proposes directement le niveau 3",
              "Tu lui dis qu’il n’a sans doute pas besoin de formation"
            ],
            "a": 0,
            "e": "Ses réponses alimentent la fiche : usage actuel de l’IA, outils utilisés."
          },
          {
            "q": "« Pas le temps, pas intéressé. »",
            "o": [
              "Tu insistes jusqu’à obtenir un rendez-vous",
              "Tu raccroches et tu passes au suivant sans rien noter",
              "« Je comprends. Je vous envoie un email avec le lien pour réserver quand ce sera le bon moment ? », et tu le notes dans le CRM"
            ],
            "a": 2,
            "e": "Chaque réponse se note dans le CRM, même un refus."
          },
          {
            "q": "Un prospect t’appelle sur ton numéro affiché sur le site. Que fais-tu ?",
            "o": [
              "Tu l’accueilles, tu qualifies et tu réserves le rendez-vous pendant l’appel",
              "Tu lui demandes de remplir le formulaire du site",
              "Tu prends son numéro pour que Gabriel le rappelle"
            ],
            "a": 0,
            "e": "Un appel entrant, c’est un prospect déjà intéressé."
          },
          {
            "q": "Laquelle de ces informations ne fait PAS partie de la qualification minimale ?",
            "o": [
              "Le chiffre d’affaires de l’entreprise",
              "L’effectif",
              "Le décideur"
            ],
            "a": 0,
            "e": "Qualification minimale : contact (nom, prénom, poste, téléphone, email), entreprise et secteur, effectif, raison du rendez-vous, usage actuel de l’IA, décideur, source du lead."
          },
          {
            "q": "Pour obtenir la raison du rendez-vous en une phrase, tu demandes :",
            "o": [
              "« Combien êtes-vous prêt à investir dans la formation ? »",
              "« Qu’est-ce qui vous ferait dire que ce rendez-vous a été utile ? »",
              "« Pourquoi vous n’utilisez pas encore l’IA ? »"
            ],
            "a": 1,
            "e": "Le closer lit cette phrase avant l’appel : c’est son point de départ."
          },
          {
            "q": "Pour savoir qui décide, tu demandes :",
            "o": [
              "« Sur ce type de sujet, c’est vous qui décidez, ou quelqu’un d’autre doit être associé ? »",
              "« C’est vous le patron ? »",
              "Rien : le décideur, c’est au closer de le trouver"
            ],
            "a": 0,
            "e": "Le décideur fait partie de ta qualification minimale."
          },
          {
            "q": "Comment réserves-tu le rendez-vous pendant l’appel ?",
            "o": [
              "Tu ouvres le Calendly de l’équipe, proposes deux créneaux et réserves avec ses coordonnées",
              "Tu demandes au prospect de réserver plus tard sur le site",
              "Tu écris à un closer pour qu’il rappelle le prospect"
            ],
            "a": 0,
            "e": "« Plutôt mardi matin ou jeudi après-midi ? » Calendly attribue un closer et envoie l’invitation."
          },
          {
            "q": "La source du lead (« Comment avez-vous entendu parler de nous ? ») :",
            "o": [
              "Ne se note que pour les leads venus des publicités Meta",
              "Se note dans chaque fiche : Figaro, Meta, site, appel Anna, email, recommandation ou autre",
              "Est facultative si le prospect a réservé en ligne"
            ],
            "a": 1,
            "e": "Le closer la complète si elle manque."
          }
        ]
      },
      "2.2": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Le setting",
        "titre": "Prix, financement et ce qu’on ne dit jamais",
        "sondage": false,
        "intro": "À relire : le process commercial (sections 4 et 6), le dossier 03 et « 20-commercial.md » (sections 6 et 7).",
        "questions": [
          {
            "q": "« Combien ça coûte ? » Ta réponse :",
            "o": [
              "« À partir de 1 500 € HT par jour, pour un groupe jusqu’à 12 personnes. »",
              "« Ça dépend du programme, le conseiller vous expliquera. Nous montons le dossier de financement pour viser zéro reste à charge. »",
              "« C’est gratuit, c’est entièrement financé. »"
            ],
            "a": 1,
            "e": "Setter et commerciale : jamais de prix. L’ordre d’idée de 1 500 € HT par jour, seul un closer le donne, à l’oral, si le prospect insiste."
          },
          {
            "q": "Le prospect insiste : « Donnez-moi au moins une fourchette. »",
            "o": [
              "Tu donnes la fourchette du niveau qui l’intéresse, d’après le catalogue",
              "Tu donnes une fourchette large pour ne pas l’engager",
              "Tu ne donnes aucun chiffre : le conseiller en parlera, et le prix exact sera dans la proposition"
            ],
            "a": 2,
            "e": "Les fourchettes du catalogue sont des repères internes : elles ne sortent jamais."
          },
          {
            "q": "« C’est financé à 100 % ? »",
            "o": [
              "« Nous montons le dossier pour viser zéro reste à charge ; c’est le financeur qui décide. »",
              "« Oui, c’est garanti. »",
              "« Oui, grâce au CPF de vos salariés. »"
            ],
            "a": 0,
            "e": "On ne promet jamais une prise en charge avant l’accord écrit du financeur."
          },
          {
            "q": "Une entreprise de 80 salariés demande si la formation sera financée.",
            "o": [
              "Tu promets le zéro reste à charge, comme pour toutes les entreprises",
              "Tu lui dis qu’on ne forme pas les entreprises de plus de 50 salariés",
              "Tu ne promets pas le zéro reste à charge : à cette taille, ça passe en général par son budget formation, et on vérifie avec l’OPCO"
            ],
            "a": 2,
            "e": "À partir de 50 salariés, l’OPCO ne finance en général pas la formation des salariés. Effectif inconnu ? Demande-le avant de parler de financement."
          },
          {
            "q": "Un OPCO, c’est :",
            "o": [
              "La certification qualité de l’organisme de formation",
              "L’organisme qui finance la formation des salariés, selon la branche de l’entreprise",
              "Le financement des dirigeants non salariés"
            ],
            "a": 1,
            "e": "C’est notre levier de financement principal. Les dirigeants non salariés et les indépendants dépendent d’un FAF."
          },
          {
            "q": "Qualiopi, c’est :",
            "o": [
              "Une certification qui rend nos formations certifiantes",
              "La certification qualité de l’organisme, obligatoire pour accéder aux fonds de la formation",
              "Le label qui rend nos formations éligibles au CPF"
            ],
            "a": 1,
            "e": "Certificat n° 883211-2. Il certifie l’organisme, pas la formation."
          },
          {
            "q": "Un prospect demande s’il peut utiliser son CPF.",
            "o": [
              "Oui, pour le niveau 1",
              "Oui, s’il complète avec un financement OPCO",
              "Non : nous ne sommes pas habilités aujourd’hui, on ne parle pas de CPF"
            ],
            "a": 2,
            "e": "Pas d’« éligible CPF », de « formation certifiante » ni de « RS6776 »."
          },
          {
            "q": "Comment parler de l’AI Act ?",
            "o": [
              "Les entreprises risquent jusqu’à 15 millions d’euros d’amende si leurs salariés ne sont pas formés",
              "L’article 4 demande aux entreprises qui utilisent l’IA de prendre des mesures pour développer la maîtrise de l’IA de leur personnel ; notre attestation et notre registre en sont la preuve",
              "L’AI Act interdit d’utiliser ChatGPT au travail sans formation"
            ],
            "a": 1,
            "e": "Depuis le Digital Omnibus, c’est une obligation de moyens. Jamais de menace d’amende : on reste factuel."
          },
          {
            "q": "Quel argument mets-tu en avant ?",
            "o": [
              "Un retour sur investissement de 300 % en un an",
              "Une formation rentabilisée en trois mois",
              "Le temps gagné et les erreurs évitées sur des tâches concrètes : emails, comptes rendus, devis, reporting"
            ],
            "a": 2,
            "e": "Aucun chiffre de ROI, aucun gain en euros, aucun pourcentage de temps gagné."
          },
          {
            "q": "Comment présenter l’expérience de Gabriel ?",
            "o": [
              "« Nous avons accompagné plus de 1 500 entreprises. »",
              "« Gabriel, notre fondateur, a accompagné plus de 1 500 professionnels depuis 2020. »",
              "« Nous avons formé plus de 1 500 professionnels cette année. »"
            ],
            "a": 1,
            "e": "C’est l’activité de Gabriel depuis 2020 : jamais « nous avons accompagné »."
          },
          {
            "q": "Le prospect veut absolument Dorian comme formateur.",
            "o": [
              "Tu le lui promets, puisque Dorian est aussi closer",
              "Tu lui réponds que Dorian ne forme plus",
              "Tu notes la demande, sans rien promettre : c’est Gabriel qui choisit le formateur de chaque mission"
            ],
            "a": 2,
            "e": "On ne promet jamais un formateur précis à un prospect."
          }
        ]
      },
      "2.3": {
        "seance": 2,
        "seanceTitre": "Séance 2 · Le setting",
        "titre": "Objections et séquence d’emails",
        "sondage": false,
        "intro": "À relire : « 20-commercial.md » (section 8) et la séquence d’emails à froid (dossier 04).",
        "questions": [
          {
            "q": "« On n’a pas le temps. »",
            "o": [
              "« Pas de souci, je vous rappelle l’année prochaine. »",
              "« Ça ne prend qu’une heure, en ligne. »",
              "« C’est justement le sujet : 1 à 2 jours sur vos propres tâches, pour en gagner ensuite chaque semaine. On cale les dates selon votre activité. »"
            ],
            "a": 2,
            "e": "On ramène l’objection au temps gagné ensuite, sur les tâches réelles."
          },
          {
            "q": "« On utilise déjà ChatGPT. »",
            "o": [
              "« Alors vous n’avez sans doute pas besoin de nous. »",
              "« ChatGPT n’est pas sûr, il faut arrêter de l’utiliser. »",
              "« Très bien : est-ce que c’est cadré (données, vérification) et utilisé dans vos vrais outils ? »"
            ],
            "a": 2,
            "e": "Utiliser l’IA dans ses vrais outils, c’est l’objet du niveau 2."
          },
          {
            "q": "« Nos données sont sensibles. »",
            "o": [
              "« Pas d’inquiétude, l’IA ne garde aucune donnée. »",
              "« Dans ce cas, l’IA n’est pas faite pour votre entreprise. »",
              "« Chaque formation intègre les règles RGPD et de confidentialité. Et pour équiper vos équipes, il existe des solutions hébergées en France. »"
            ],
            "a": 2,
            "e": "La règle d’or RGPD : jamais de données clients, de devis ou de contrats dans une IA grand public gratuite."
          },
          {
            "q": "« Mes salariés ont peur d’être remplacés. »",
            "o": [
              "« Certains postes vont disparaître, autant qu’ils s’y préparent. »",
              "« Ce n’est pas le sujet de la formation. »",
              "« La formation montre l’IA comme un outil à leur service : on part de leurs tâches, ils gardent la main et la validation. »"
            ],
            "a": 2,
            "e": "On rassure en partant de leurs tâches."
          },
          {
            "q": "« Je dois en parler à ma direction. »",
            "o": [
              "« Qui d’autre doit être convaincu ? », puis tu proposes un échange avec le décideur",
              "« D’accord, rappelez-moi quand vous aurez sa réponse. »",
              "Tu demandes le numéro du directeur pour l’appeler directement"
            ],
            "a": 0,
            "e": "Le décideur fait partie de ta qualification : autant l’associer au rendez-vous."
          },
          {
            "q": "La séquence d’emails à froid, c’est :",
            "o": [
              "4 emails : J0, J+3 ou 4, J+10 et J+17",
              "6 emails, un par semaine",
              "3 emails sur trois jours de suite"
            ],
            "a": 0,
            "e": "Un email par palier : accroche temps gagné, données et usage non encadré, financement, puis clôture sans pression."
          },
          {
            "q": "Le prospect répond après le deuxième email.",
            "o": [
              "Tu laisses partir les emails 3 et 4, au cas où",
              "Tu arrêtes la séquence : on s’arrête dès qu’il y a une réponse",
              "Tu reprends la séquence au premier email"
            ],
            "a": 1,
            "e": "Et jamais de relance après l’email 4."
          },
          {
            "q": "Avant de lancer une séquence, il faut :",
            "o": [
              "Indiquer dans le premier email la source des coordonnées du prospect",
              "Envoyer au moins 300 emails par jour depuis une seule boîte",
              "Mettre une fourchette de prix dans l’email sur le financement"
            ],
            "a": 0,
            "e": "C’est une obligation CNIL. Et on limite le volume : idéalement 50 à 100 emails par jour et par boîte."
          },
          {
            "q": "Sur quelle plateforme partent les emails à froid ?",
            "o": [
              "Brevo",
              "Time",
              "Calendly"
            ],
            "a": 1,
            "e": "Calendly sert à réserver les rendez-vous ; les relances se suivent dans le CRM."
          },
          {
            "q": "Un email ou un message écrit à un prospect peut-il contenir un prix ?",
            "o": [
              "Non, aucun prix par écrit, sauf texte validé par Gabriel",
              "Oui, si le prospect le demande par écrit",
              "Oui, mais seulement l’ordre d’idée de 1 500 € HT par jour"
            ],
            "a": 0,
            "e": "Le prix final est toujours celui de la proposition de Gabriel."
          }
        ]
      },
      "3.1": {
        "seance": 3,
        "seanceTitre": "Séance 3 · Mises en situation",
        "titre": "Mises en situation",
        "sondage": false,
        "intro": "Des cas concrets : applique tout ce qui précède.",
        "questions": [
          {
            "q": "Un prospect t’écrit depuis jean.martin@orange.fr. Que sais-tu de son entreprise ?",
            "o": [
              "Il travaille chez Orange",
              "C’est une grande entreprise, il faut prévoir le budget formation",
              "Rien : c’est une adresse personnelle, tu lui demandes le nom de son entreprise"
            ],
            "a": 2,
            "e": "Une adresse grand public ne dit rien de l’employeur. Un domaine d’entreprise est un indice, à faire confirmer."
          },
          {
            "q": "Un prospect veut voir une démonstration de Goodweek.",
            "o": [
              "Tu la fais toi-même en partage d’écran",
              "Tu lui crées toi-même un accès d’essai",
              "Démonstration et essai : uniquement avec Gabriel"
            ],
            "a": 2,
            "e": "Goodweek se vend sur une proposition séparée, jamais conditionnée à une formation."
          },
          {
            "q": "Un prospect te demande si telle entreprise de sa région est cliente chez nous.",
            "o": [
              "Tu confirmes si c’est le cas, pour le rassurer",
              "Tu ne cites jamais un prospect ou un client en cours ; nos références : GRDF Est et l’ECM Nancy",
              "Tu cites les entreprises des programmes d’exemple du Drive"
            ],
            "a": 1,
            "e": "Seules références citables : une formation déployée pour GRDF Est et des interventions régulières à l’ECM Nancy."
          },
          {
            "q": "Cabinet comptable de 15 personnes : quelques salariés utilisent ChatGPT gratuit sans cadre, la dirigeante veut des règles communes. Quel niveau ?",
            "o": [
              "Niveau 1",
              "Niveau 2",
              "Niveau 3"
            ],
            "a": 0,
            "e": "Signal N1 : « certains l’utilisent sans cadre », « je veux que tout le monde parte sur de bonnes bases ». Le closer confirme, Gabriel tranche."
          },
          {
            "q": "« On a Copilot, mais on ne s’en sert ni pour nos devis ni dans notre CRM. » Quel niveau ?",
            "o": [
              "Niveau 1",
              "Niveau 2",
              "Niveau 3"
            ],
            "a": 1,
            "e": "Signal N2 : l’IA est là, mais pas dans les vrais outils ni sur les tâches métier."
          },
          {
            "q": "« Je veux automatiser nos relances et la saisie des mandats. » Quel niveau ?",
            "o": [
              "Niveau 1",
              "Niveau 2",
              "Niveau 3"
            ],
            "a": 2,
            "e": "Signal N3 : ne plus avoir à faire la tâche. Le reste de l’équipe peut suivre un niveau 1."
          },
          {
            "q": "Le rendez-vous est calé, mais tu ne connais pas encore l’effectif.",
            "o": [
              "Tu le demandes avant de raccrocher : « Vous êtes combien dans l’entreprise ? »",
              "Ce n’est pas grave, le closer le demandera",
              "Tu l’estimes d’après le site de l’entreprise"
            ],
            "a": 0,
            "e": "L’effectif fait partie de la qualification minimale, et il change tout pour le financement (50 salariés et plus)."
          },
          {
            "q": "Qui finance la formation d’un artisan inscrit à la Chambre des métiers, pour lui-même ?",
            "o": [
              "L’OPCO de sa branche",
              "Le FAFCEA",
              "L’AGEFICE"
            ],
            "a": 1,
            "e": "Salariés : OPCO de la branche. Dirigeants non salariés du commerce, de l’industrie ou des services : AGEFICE. Professions libérales : FIF-PL. Artisans : FAFCEA. Cathy vérifie, on n’annonce aucun montant."
          },
          {
            "q": "Le prospect vient de réserver et raccroche. Il te reste à :",
            "o": [
              "Compléter la fiche CRM, avec le closer attribué, pour qu’il arrive préparé",
              "Rien, Calendly s’occupe de tout",
              "Lui envoyer par email une estimation du prix"
            ],
            "a": 0,
            "e": "Le closer lit la fiche avant l’appel."
          }
        ]
      }
    }
  }
};
