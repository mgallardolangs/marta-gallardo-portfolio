---
slug: "traduction-seo"
translationKey: "traduccion-seo"
title: "Traduction SEO : traduire votre site sans perdre son référencement"
description: "J'ai terminé la formation SEO international de Semrush. Voici ce qu'il faut pour traduire votre site sans perdre votre référencement sur Google."
date: "2026-11-17"
tags: ["traduction SEO", "SEO international", "hreflang", "localisation"]
lang: "fr"
---

La semaine dernière, je vous racontais que je suivais la formation SEO international de Semrush Academy, animée par Aleyda Solis. Je l'ai terminée et j'ai obtenu la certification. Si je devais résumer ses treize leçons en une phrase, ce serait celle-ci : **la traduction SEO ne consiste pas à traduire les textes mot à mot, mais à faire en sorte que chaque version de votre site se positionne sur son propre marché : que Google sache quelle version afficher dans chaque pays et que chacune reprenne les mots que l'on y recherche vraiment**.

<figure>
  <img src="/images/blog/certificado-seo-internacional-semrush.webp" alt="Certificat de la formation International SEO de Semrush Academy au nom de Marta Gallardo Albertu, signé par Aleyda Solis" width="1200" height="848" loading="lazy" decoding="async" />
  <figcaption>Mon certificat de la formation SEO international de Semrush Academy.</figcaption>
</figure>

Dans la [première partie de cette série](/fr/blog/seo-international-au-dela-de-la-traduction-de-votre-site), j'ai parlé du choix des marchés. Aujourd'hui, je m'intéresse à la suite : ce qu'il faut pour traduire votre site sans perdre son référencement. Il y a quatre éléments : la structure des URL, le hreflang, le contenu localisé et le suivi.

## Qu'est-ce que la traduction SEO ?

La traduction SEO consiste à traduire le contenu d'un site en tenant compte de la façon dont les gens cherchent dans chaque langue et dans chaque pays. Une bonne traduction ne suffit pas. Elle doit aussi reprendre les mots que vos clients tapent dans le moteur de recherche, et le site doit être conçu pour que Google sache quelle version montrer à chaque personne.

Si vous traduisez seulement le texte, vous risquez d'avoir des pages impeccables que personne ne trouve.

## Où vivent vos langues : sous-répertoires, sous-domaines ou domaines par pays

La première étape consiste à décider où placer chaque version de votre site. La formation présente trois options valables :

- **Les domaines par pays** (ccTLD), comme `votresite.fr` ou `votresite.de`. Ils inspirent beaucoup de confiance, car l'internaute voit un domaine de son pays. En revanche, chaque domaine part de zéro et a besoin de son propre contenu et de ses propres liens : c'est l'option la plus coûteuse.
- **Les sous-répertoires**, comme `votresite.com/fr/`. Ils sont faciles à mettre en place et peu coûteux à entretenir. En plus, toutes les versions profitent de l'autorité que votre domaine a déjà.
- **Les sous-domaines**, comme `fr.votresite.com`. C'est un compromis : chaque version fonctionne presque comme un site à part, mais demande moins de ressources que plusieurs domaines.

Et une option à **ne jamais utiliser** : les paramètres d'URL, comme `votresite.com/services?lang=fr`. Google ne les recommande pas pour séparer les langues.

Sur mon site, j'utilise des sous-répertoires (`/en/` et `/fr/`). Pour une petite entreprise qui veut toucher plusieurs marchés avec un seul domaine, c'est souvent le choix le plus judicieux.

## Hreflang : comment indiquer à Google quelle version afficher

Le hreflang est une balise que l'on ajoute au code de chaque page. Elle indique à Google la langue de la page (et, si besoin, le pays visé) et ses versions dans d'autres langues. Ainsi, une personne qui cherche en français voit votre page en français et non la version espagnole.

Voici le bloc de balises d'une page qui existe en trois versions :

```html
<link rel="alternate" hreflang="es" href="https://votresite.com/" />
<link rel="alternate" hreflang="en" href="https://votresite.com/en/" />
<link rel="alternate" hreflang="fr" href="https://votresite.com/fr/" />
<link rel="alternate" hreflang="x-default" href="https://votresite.com/" />
```

La valeur `x-default` indique quelle version montrer aux personnes qui cherchent dans une langue que votre site ne propose pas.

Le principe est simple, mais il est facile de se tromper en l'appliquant. Voici les erreurs les plus fréquentes vues dans la formation :

- **La balise de retour manque.** Si la page espagnole renvoie vers la page française, la page française doit elle aussi renvoyer vers l'espagnole. Sinon, Google ignore la balise.
- **Les balises renvoient vers des pages que Google n'indexe pas**, par exemple parce qu'elles sont redirigées, renvoient une erreur ou portent une balise `noindex`.
- **Le pays est indiqué sans la langue.** Vous pouvez indiquer seulement la langue (`fr`), mais jamais seulement le pays.
- **Le code de langue ne correspond pas à la langue réelle de la page.** Une page marquée comme française doit être en français.

## Traduire n'est pas localiser : le contenu

C'est la partie qui m'intéressait le plus en tant que traductrice, et la formation y consacre plusieurs leçons. L'idée principale : **la structure et le hreflang ne servent à rien si le contenu ne répond pas à la façon dont les gens cherchent sur chaque marché**.

C'est pourquoi, avant de traduire, il faut étudier les mots-clés de chaque marché, même quand ils partagent une langue. L'exemple de la formation est parlant : une agence immobilière de Miami qui veut s'implanter au Royaume-Uni doit parler de *flats*, et non d'*apartments*. C'est le même enjeu entre le français de France, de Suisse et de Belgique.

La formation propose de créer le contenu international en trois phases :

1. **Partir de l'existant.** On reprend le contenu qui fonctionne déjà sur votre marché actuel et on le traduit avec l'IA.
2. **La relecture par un locuteur natif.** Une personne native, qui connaît le secteur et le SEO, relit cette traduction et l'adapte à la culture et à la façon de chercher du marché. Le résultat : une première version prête à être publiée.
3. **La localisation continue.** On met à jour le contenu et on publie de nouveaux contenus avec des références propres au marché cible. Cette phase ne s'arrête jamais.

Deux notions méritent d'être distinguées. **Localiser**, c'est adapter le contenu aux préférences culturelles et linguistiques d'un public. **Transcréer** va plus loin : on mêle traduction et rédaction pour transmettre le même message avec des références propres au marché.

J'ai apprécié que la formation ne présente pas l'IA et le traducteur comme des alternatives. La traduction automatique est une bonne base, mais pas le résultat final. C'est la relecture d'une personne native qui transforme un texte correct en un texte qui se positionne et qui convainc.

## Ce que j'ai appliqué sur mon propre site

En faisant les exercices de la formation avec mon site, je me suis rendu compte que mes pages en allemand, en italien et en catalan étaient traduites, mais pas localisées. Je n'avais pas étudié la façon dont on cherche sur ces marchés. J'ai donc décidé de les retirer pour le moment et de les rediriger vers les versions espagnole et anglaise, que je travaille en profondeur.

Dans un prochain article, je vous raconterai ce changement en détail et ses effets.

## Après la publication : le suivi

Dernière idée de la formation : le SEO international ne fonctionne pas tout seul. Une fois les versions traduites en ligne, il faut surveiller chacune d'elles :

- Dans **Google Search Console**, vérifiez que Google explore et indexe les nouvelles pages, et suivez leurs positions dans chaque pays.
- Avec un outil d'audit, comme le Site Audit de Semrush ou d'Ahrefs, vérifiez que votre hreflang ne contient pas d'erreurs.
- Dans **Google Analytics**, regardez les visites et les conversions par pays.
- Chaque fois que vous modifiez ou supprimez une URL, vérifiez que le hreflang de toutes ses versions pointe vers la nouvelle URL.

## Mon prochain objectif

Maintenant que la formation SEO international est terminée, j'ai commencé cette semaine une formation sur la rédaction d'articles avec l'IA. Je veux bien comprendre quelles parties du travail de contenu peuvent être automatisées et lesquelles ont besoin d'une personne. Ce sera le sujet du prochain article de cette série.

## En résumé

| Élément | Ce que cela implique | Première étape |
|---|---|---|
| Structure | Chaque langue a besoin de son propre espace sur le site | Choisir entre sous-répertoires, sous-domaines ou domaines par pays |
| Hreflang | Google doit savoir quelle version montrer à chaque personne | Vérifier que chaque page renvoie vers ses versions et qu'elles lui renvoient le lien |
| Contenu | Traduire ne suffit pas : il faut localiser | Étudier les mots-clés de chaque marché avant de traduire |
| Suivi | Chaque version a besoin de son propre suivi | Consulter Search Console et vos statistiques par pays |

## Comment je peux vous aider

Si vous souhaitez traduire votre site et que chaque version se positionne sur son marché, découvrez comment je travaille la [traduction SEO](/fr/services/traduction) et le [SEO international](/fr/services/seo), ou [contactez-moi](/fr/contact) directement.
