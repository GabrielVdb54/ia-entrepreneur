/**
 * Banque de questions du quiz des séances IA de Prudence Créole (agence
 * Generali, La Réunion), novembre et décembre 2026 : séance 3 « Comprendre
 * l’IA et bien lui parler » et séance 4 « Vos tâches, vos règles, vos prompts ».
 *
 * Fichier de données, lu seulement par api/quiz.js, séparé de
 * _quiz-prudence.js (la partie vente) pour que chaque banque puisse être
 * remplacée sans toucher à l’autre. Lien stagiaire : /quiz/?f=prudence-ia&a=3.1
 *
 * Champs : q = question, o = options, a = index de la bonne option (null pour
 * un sondage), e = explication affichée et envoyée avec la correction.
 */

const SONDAGE_USAGE = {
  q: 'Aujourd’hui, l’IA et moi…',
  o: [
    'Je ne l’utilise pas',
    'Je l’utilise pour moi, pas au travail',
    'Je l’utilise un peu au travail (reformuler, écrire)',
    'Je l’utilise souvent au travail'
  ],
  a: null,
  e: 'On regarde les réponses ensemble, sans juger.'
};

const SONDAGE_INQUIETUDE = {
  q: 'Ce qui m’inquiète le plus avec l’IA :',
  o: [
    'Faire une erreur devant un client',
    'Ne pas savoir m’en servir',
    'Les données de mes clients',
    'Qu’elle remplace une partie de mon travail'
  ],
  a: null,
  e: 'Toutes ces inquiétudes sont légitimes. On y répond au fil des séances.'
};

const VRAI_FAUX = ['Vrai', 'Faux'];

const TACHE = [
  'Oui : l’IA peut s’en charger, je relis avant envoi',
  'Oui pour un brouillon, mais la décision reste à moi',
  'Non, pas pour l’IA'
];

const FEU = [
  'Vert : j’y vais',
  'Orange : j’anonymise d’abord',
  'Rouge : jamais dans une IA gratuite'
];

const S3 = 'Séance 3 · Comprendre l’IA et bien lui parler';
const S4 = 'Séance 4 · Vos tâches, vos règles, vos prompts';

export const FORMATIONS = {
  'prudence-ia': {
    titre: 'L’IA au quotidien en agence · Prudence Créole',
    groupes: {
      A: 'Groupe 1 · Saint-André et Saint-Benoît',
      B: 'Groupe 2 · Saint-Denis'
    },
    activites: {
      '3.1': {
        seance: 3,
        seanceTitre: S3,
        titre: 'Sondage, non noté',
        sondage: true,
        intro: null,
        questions: [
          SONDAGE_USAGE,
          {
            q: 'L’IA que j’ai le plus utilisée :',
            o: ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'Aucune'],
            a: null,
            e: 'On voit aujourd’hui à quoi chacune sert le mieux.'
          },
          SONDAGE_INQUIETUDE
        ]
      },

      '3.2': {
        seance: 3,
        seanceTitre: S3,
        titre: 'Qui se souvient des dates ?',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'ChatGPT est sorti en…',
            o: ['2017', '2020', '2022', '2024'],
            a: 2,
            e: 'Le 30 novembre 2022. En deux mois, environ 100 millions de personnes l’avaient essayé.'
          },
          {
            q: 'Le mot « intelligence artificielle » est né…',
            o: [
              'En 1956, lors d’une conférence de chercheurs aux États-Unis',
              'En 1997, quand un ordinateur a battu le champion du monde d’échecs',
              'En 2022, avec ChatGPT'
            ],
            a: 0,
            e: 'À la conférence de Dartmouth, en 1956. L’IA a donc 70 ans.'
          },
          {
            q: 'L’invention de 2017 qui fait tourner toutes les IA actuelles s’appelle…',
            o: ['Le Transformer, inventé chez Google', 'Le microprocesseur', 'Le cloud'],
            a: 0,
            e: 'C’est le T de ChatGPT : Generative Pre-trained Transformer.'
          },
          {
            q: 'L’AI Act, la loi européenne sur l’IA, est entré en vigueur en…',
            o: ['2018', '2024', '2027'],
            a: 1,
            e: 'Le 1er août 2024, avec des obligations qui arrivent par étapes. 2018, c’est le RGPD. On en parle en séance 4.'
          }
        ]
      },

      '3.3': {
        seance: 3,
        seanceTitre: S3,
        titre: 'Vrai ou faux : comment l’IA répond',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Quand ChatGPT répond, il va chercher la bonne réponse dans une grande base de données.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Il fabrique sa réponse mot après mot, en choisissant le mot le plus probable. Même quand il cherche sur internet, il rédige de la même façon.'
          },
          {
            q: 'Une réponse bien écrite, sûre d’elle et détaillée a plus de chances d’être vraie.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. L’IA écrit aussi bien quand elle se trompe. Le style ne prouve rien.'
          },
          {
            q: 'Si l’IA cite un article de loi précis, avec son numéro, c’est qu’il existe et qu’il dit bien ça.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Elle peut inventer un article, ou citer un vrai article qui parle d’autre chose. On vérifie sur legifrance.gouv.fr.'
          },
          {
            q: 'Si je lui dis qu’elle s’est trompée, elle vérifie avant de changer d’avis.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Elle a tendance à vous donner raison pour vous faire plaisir, même quand elle avait juste. C’est à vous de vérifier.'
          }
        ]
      },

      '3.4': {
        seance: 3,
        seanceTitre: S3,
        titre: 'Quelle IA pour quelle situation ?',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Vous voulez poser des questions sur les conditions générales auto (un PDF de 60 pages) et voir le passage exact.',
            o: ['NotebookLM', 'Perplexity', 'Une IA qui crée des images'],
            a: 0,
            e: 'NotebookLM répond à partir de VOS documents, en citant le passage.'
          },
          {
            q: 'Vous voulez dicter à voix haute, comme un vocal, et récupérer un message écrit.',
            o: ['ChatGPT en mode vocal', 'NotebookLM', 'Perplexity'],
            a: 0,
            e: 'Le mode vocal de ChatGPT, ou le micro de Claude, ou la dictée de votre téléphone.'
          },
          {
            q: 'Vous voulez coller la fiche d’un vrai client (nom, plaque, téléphone) pour préparer une relance.',
            o: [
              'N’importe quelle IA gratuite, c’est plus rapide',
              'Seulement l’outil validé par l’agence, ou en remplaçant les infos par [Client], [Véhicule]',
              'DeepSeek, il est gratuit'
            ],
            a: 1,
            e: 'Les données de vos clients ne vont jamais dans une IA gratuite. On anonymise, ou on utilise l’outil validé par l’agence.'
          },
          {
            q: 'Vous cherchez une information récente sur internet, avec les liens des sources.',
            o: ['Perplexity', 'NotebookLM', 'Une IA sans accès à internet'],
            a: 0,
            e: 'Perplexity répond en phrases, avec ses sources. On clique pour vérifier.'
          }
        ]
      },

      '3.5': {
        seance: 3,
        seanceTitre: S3,
        titre: 'Quiz de fin de séance',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Dans CRAFT, le A veut dire…',
            o: ['Action : ce que je veux, avec un verbe', 'Assurance', 'Adresse du client'],
            a: 0,
            e: 'Contexte, Rôle, Action, Format, Ton.'
          },
          {
            q: 'Quelle demande donnera le meilleur message ?',
            o: [
              '« Écris une relance carte grise. »',
              '« Tu es une conseillère d’agence chaleureuse. [Client] a assuré sa voiture il y a 5 semaines avec le certificat provisoire. Écris un WhatsApp de 4 lignes pour lui demander sa carte grise définitive, ton amical. »',
              '« Relance vite fait le client, merci ! »'
            ],
            a: 1,
            e: 'Contexte, rôle, action, format et ton : l’IA n’a plus rien à inventer.'
          },
          {
            q: 'Le résultat est presque bon, mais trop long. Le mieux :',
            o: [
              'Ouvrir une nouvelle conversation et tout réécrire',
              'Répondre « Plus court, 3 lignes maximum »',
              'L’envoyer tel quel'
            ],
            a: 1,
            e: 'On améliore la réponse dans la même conversation, on ne recommence pas de zéro.'
          },
          {
            q: 'Dans une IA gratuite, vous pouvez écrire :',
            o: [
              '« Mme Payet, 12 rue des Lilas, AB-123-CD »',
              '« [Cliente], [Adresse], [Véhicule] »',
              'Son numéro de contrat, ce n’est pas grave'
            ],
            a: 1,
            e: 'Rien qui permette de reconnaître un client. Les crochets marchent aussi bien.'
          },
          {
            q: 'L’IA vous cite un article du Code des assurances. Vous…',
            o: [
              'Le recopiez dans votre mail',
              'Vérifiez sur legifrance.gouv.fr avant de l’utiliser',
              'Lui demandez si elle est sûre, et la croyez si elle dit oui'
            ],
            a: 1,
            e: 'Un chiffre, une date, un article : on vérifie toujours à la source.'
          }
        ]
      },

      '4.1': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Rappel de la séance 3',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Une IA comme ChatGPT fabrique sa réponse…',
            o: [
              'En cherchant dans une encyclopédie',
              'En devinant le mot le plus probable, l’un après l’autre',
              'En demandant à des humains'
            ],
            a: 1,
            e: 'Comme le clavier de votre téléphone, en beaucoup plus gros.'
          },
          {
            q: 'Les 5 lettres de CRAFT :',
            o: [
              'Contexte, Rôle, Action, Format, Ton',
              'Client, Relance, Assurance, Facture, Tarif',
              'Contrat, Risque, Avenant, Franchise, Tiers'
            ],
            a: 0,
            e: 'Contexte, Rôle, Action, Format, Ton. Le contexte est le plus important.'
          },
          {
            q: 'Le test du nombre entre 1 et 30 montre que…',
            o: [
              'L’IA tire vraiment au hasard',
              'L’IA donne la réponse la plus probable, pas une réponse au hasard',
              'L’IA connaît votre nombre préféré'
            ],
            a: 1,
            e: 'Elle ne réfléchit pas : elle prédit. D’où les mêmes nombres chez tout le monde.'
          }
        ]
      },

      '4.2': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Bonne tâche pour l’IA ?',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Rédiger chaque semaine les relances pour les cartes grises définitives pas reçues.',
            o: TACHE,
            a: 0,
            e: 'Fréquent, long, du texte, et vous relisez avant d’envoyer : la tâche idéale.'
          },
          {
            q: 'Laisser l’IA décider si un sinistre est couvert, et l’annoncer au client.',
            o: TACHE,
            a: 2,
            e: 'C’est du conseil et une décision : elle reste au gestionnaire et à vous. L’IA peut aider à lire le contrat, pas trancher.'
          },
          {
            q: 'Résumer un long mail de réclamation et proposer une trame de réponse.',
            o: TACHE,
            a: 1,
            e: 'Très bon usage, mais la réponse finale est la vôtre : vous ajustez et vous décidez.'
          },
          {
            q: 'Préparer des messages d’anniversaire personnalisés pour les clients du mois.',
            o: TACHE,
            a: 0,
            e: 'Répétitif et sans risque : l’IA prépare, vous relisez et vous envoyez.'
          },
          {
            q: 'Calculer et annoncer à un client le tarif de son contrat.',
            o: TACHE,
            a: 2,
            e: 'Le tarif vient de votre outil de tarification. Une IA peut se tromper dans un calcul ou inventer un montant.'
          }
        ]
      },

      '4.3': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Vert, orange ou rouge ?',
        sondage: false,
        intro: 'Est-ce que je peux le mettre dans une IA gratuite ?',
        questions: [
          {
            q: 'Reformuler un paragraphe qui explique ce qu’est une franchise.',
            o: FEU,
            a: 0,
            e: 'Aucune donnée client : vous pouvez y aller.'
          },
          {
            q: 'Préparer une relance pour M. Hoarau, 06 92 00 00 00, carte grise manquante.',
            o: FEU,
            a: 1,
            e: 'Remplacez par [Client] et [Téléphone] : l’IA fait le même travail, sans la donnée.'
          },
          {
            q: 'Coller la photo du permis et de la carte grise d’un client pour qu’elle remplisse le dossier.',
            o: FEU,
            a: 2,
            e: 'Des pièces d’identité et des données personnelles : jamais dans une IA gratuite.'
          },
          {
            q: 'Demander un mail pour une cliente en arrêt maladie qui n’a pas payé sa cotisation, en précisant sa maladie.',
            o: FEU,
            a: 2,
            e: 'La santé est une donnée sensible au sens du RGPD. Elle n’a rien à faire dans une IA.'
          },
          {
            q: 'Poser des questions sur les conditions générales auto, celles que reçoit chaque client.',
            o: FEU,
            a: 0,
            e: 'Un document remis à tous les clients, sans donnée personnelle : vert.'
          },
          {
            q: 'Coller l’export Excel de tous les clients de l’agence pour trouver ceux sans contrat habitation.',
            o: FEU,
            a: 2,
            e: 'C’est exactement ce qu’on fera en présentiel, avec l’outil validé par l’agence et les bons réglages. Pas dans une IA gratuite.'
          }
        ]
      },

      '4.4': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Vrai ou faux : les règles',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'L’AI Act demande aux entreprises qui utilisent l’IA d’agir pour que leurs équipes sachent s’en servir.',
            o: VRAI_FAUX,
            a: 0,
            e: 'Vrai. Article 4, depuis le 2 février 2025, assoupli en juillet 2026 : l’entreprise doit prendre des mesures, comme cette formation.'
          },
          {
            q: 'Si l’IA a rédigé le conseil envoyé au client, c’est elle qui est responsable en cas d’erreur.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Le devoir de conseil reste le vôtre et celui de l’agence.'
          },
          {
            q: 'Une plaque d’immatriculation n’est pas une donnée personnelle.',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Elle permet de retrouver le propriétaire du véhicule : c’est une donnée personnelle.'
          },
          {
            q: 'Diffuser sans son accord une fausse vidéo réaliste d’une personne peut être puni de prison.',
            o: VRAI_FAUX,
            a: 0,
            e: 'Vrai. Article 226-8 du Code pénal, modifié par la loi SREN de 2024 : jusqu’à 1 an et 15 000 €, 2 ans et 45 000 € si c’est diffusé en ligne.'
          },
          {
            q: 'Pour l’AI Act, une IA qui fixe le prix des contrats auto est « à haut risque ».',
            o: VRAI_FAUX,
            a: 1,
            e: 'Faux. Le haut risque vise la tarification en assurance vie et santé. Ces règles s’appliqueront en décembre 2027.'
          }
        ]
      },

      '4.5': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Le sondage de la séance 3, une seconde fois',
        sondage: true,
        intro: null,
        questions: [SONDAGE_USAGE, SONDAGE_INQUIETUDE]
      },

      '4.6': {
        seance: 4,
        seanceTitre: S4,
        titre: 'Quiz final sur les séances IA',
        sondage: false,
        intro: null,
        questions: [
          {
            q: 'Une réponse d’IA très détaillée et sûre d’elle est…',
            o: ['Forcément juste', 'À vérifier comme les autres', 'Toujours inventée'],
            a: 1,
            e: 'L’IA écrit aussi bien quand elle se trompe.'
          },
          {
            q: 'Dans « Écris un mail de relance, ton cordial », il manque…',
            o: ['Le contexte, le rôle et le format', 'Le ton', 'Rien'],
            a: 0,
            e: 'Il y a l’action et le ton. Sans contexte, l’IA invente la situation.'
          },
          {
            q: 'Pour interroger un PDF de conditions générales et voir le passage cité :',
            o: ['NotebookLM', 'Une IA qui crée des images', 'DeepSeek'],
            a: 0,
            e: 'NotebookLM répond à partir de vos documents, en citant le passage.'
          },
          {
            q: 'Avant de coller un message client dans une IA gratuite, je remplace…',
            o: [
              'Rien, c’est un simple message',
              'Le nom, le téléphone, la plaque et tout ce qui permet de reconnaître le client',
              'Seulement le nom'
            ],
            a: 1,
            e: 'Une plaque, un numéro de contrat ou un téléphone suffisent à reconnaître quelqu’un.'
          },
          {
            q: 'La tâche à confier en premier à l’IA :',
            o: [
              'Celle que je fais souvent, qui me prend du temps, à base de texte, et que je peux relire',
              'La plus rare et la plus risquée',
              'Celle où il faut décider à la place du client'
            ],
            a: 0,
            e: 'Fréquente, longue, du texte, et relue par vous.'
          },
          {
            q: 'Un « client » vous envoie un vocal pressant pour changer le RIB de son indemnisation.',
            o: [
              'Vous changez le RIB, c’est bien sa voix',
              'Vous rappelez sur le numéro du dossier avant de toucher à quoi que ce soit',
              'Vous demandez une photo de sa carte d’identité par WhatsApp'
            ],
            a: 1,
            e: 'Une voix se clone. Urgence + argent = on rappelle sur un numéro qu’on connaît déjà.'
          },
          {
            q: 'Depuis le 2 août 2026, celui qui diffuse un deepfake doit…',
            o: [
              'Indiquer que le contenu a été généré ou modifié par IA',
              'Le faire valider par la CNIL',
              'Rien de particulier'
            ],
            a: 0,
            e: 'C’est l’obligation de transparence de l’article 50 de l’AI Act.'
          },
          {
            q: 'Qui est responsable du conseil donné au client quand l’IA a aidé à rédiger ?',
            o: ['L’IA', 'L’éditeur de l’IA', 'Vous et l’agence'],
            a: 2,
            e: 'L’IA propose, vous décidez. Le devoir de conseil ne se délègue pas.'
          }
        ]
      }
    }
  }
};
