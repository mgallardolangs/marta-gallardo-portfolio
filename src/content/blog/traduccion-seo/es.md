---
slug: "traduccion-seo"
translationKey: "traduccion-seo"
title: "Traducción SEO: cómo traducir tu web sin perder posicionamiento"
description: "He terminado el curso de SEO internacional de Semrush. Te cuento qué hace falta para traducir tu web sin perder posicionamiento en Google."
date: "2026-11-20"
tags: ["traducción SEO", "SEO internacional", "hreflang", "localización"]
lang: "es"
---

La semana pasada te conté que estaba haciendo el curso de SEO internacional de Semrush Academy, impartido por Aleyda Solis. Ya lo he terminado y tengo la certificación. Si tuviera que resumir las trece lecciones en una frase, sería esta: **la traducción SEO no consiste en traducir los textos palabra por palabra, sino en conseguir que cada versión de tu web posicione en su propio mercado: que Google sepa qué versión mostrar en cada país y que cada una use las palabras que de verdad se buscan allí**.

En la [primera parte de esta serie](/blog/seo-internacional-mas-alla-de-traducir-tu-web) hablé de cómo elegir los mercados. Hoy toca lo que viene después: qué hace falta para traducir tu web sin perder posicionamiento. Son cuatro piezas: la estructura de las URL, el hreflang, el contenido localizado y el seguimiento.

## ¿Qué es la traducción SEO?

La traducción SEO es traducir el contenido de una web pensando en cómo busca la gente en cada idioma y en cada país. No basta con que el texto esté bien traducido. También tiene que usar las palabras que escribe tu cliente en el buscador, y la web tiene que estar montada para que Google sepa qué versión enseñar a cada persona.

Si solo traduces el texto, puedes acabar con páginas correctas que nadie encuentra.

## Dónde viven tus idiomas: subcarpetas, subdominios o dominios por país

Lo primero es decidir dónde va cada versión de tu web. El curso presenta tres opciones válidas:

- **Dominios por país** (ccTLD), como `tuweb.fr` o `tuweb.de`. Generan mucha confianza, porque el usuario ve un dominio de su país. A cambio, cada dominio empieza de cero y necesita su propio contenido y sus propios enlaces, así que es la opción más cara.
- **Subcarpetas**, como `tuweb.com/fr/`. Son fáciles de montar y baratas de mantener. Además, todas las versiones aprovechan la autoridad que ya tiene tu dominio.
- **Subdominios**, como `fr.tuweb.com`. Son un punto intermedio: cada versión funciona casi como una web propia, pero necesitas menos recursos que con varios dominios.

Y una opción que **no hay que usar nunca**: los parámetros en la URL, como `tuweb.com/servicios?lang=fr`. Google no los recomienda para separar idiomas.

En mi web uso subcarpetas (`/en/` y `/fr/`). Para un negocio pequeño que quiere llegar a varios mercados con un solo dominio, suele ser la opción más sensata.

## Hreflang: cómo le dices a Google qué versión mostrar

El hreflang es una etiqueta que se añade al código de cada página. Le dice a Google en qué idioma está esa página (y, si hace falta, para qué país) y cuáles son sus versiones en otros idiomas. Así, una persona que busca en francés ve tu página en francés y no la española.

Así se ve el bloque de etiquetas de una página con tres versiones:

```html
<link rel="alternate" hreflang="es" href="https://tuweb.com/" />
<link rel="alternate" hreflang="en" href="https://tuweb.com/en/" />
<link rel="alternate" hreflang="fr" href="https://tuweb.com/fr/" />
<link rel="alternate" hreflang="x-default" href="https://tuweb.com/" />
```

El valor `x-default` indica qué versión mostrar a quien busca en un idioma que tu web no tiene.

El concepto es sencillo, pero es fácil equivocarse al aplicarlo. Estos son los errores más habituales que vi en el curso:

- **Falta la etiqueta de vuelta.** Si la página en español apunta a la francesa, la francesa tiene que apuntar también a la española. Si no, Google ignora la etiqueta.
- **Se apunta a páginas que Google no indexa**, por ejemplo, porque están redirigidas, dan error o tienen un `noindex`.
- **Se pone el país sin el idioma.** Puedes indicar solo el idioma (`fr`), pero nunca solo el país.
- **El código de idioma no coincide con el idioma real de la página.** Una página marcada como francesa tiene que estar en francés.

## Traducir no es localizar: el contenido

Esta es la parte que más me interesaba como traductora, y el curso le dedica varias lecciones. La idea principal es que **la estructura y el hreflang no sirven de nada si el contenido no responde a cómo busca la gente en cada mercado**.

Por eso, antes de traducir hay que investigar las palabras clave de cada mercado, aunque compartan idioma. El ejemplo del curso lo deja claro: una inmobiliaria de Miami que quiere vender en Reino Unido tiene que hablar de *flats*, no de *apartments*.

El curso propone crear el contenido internacional en tres fases:

1. **Aprovechar lo que ya tienes.** Se parte del contenido que ya funciona en tu mercado actual y se traduce con IA.
2. **Revisión de un nativo.** Una persona nativa, que conozca el sector y el SEO, revisa esa traducción y la adapta a la cultura y a la forma de buscar del mercado. El resultado es una primera versión lista para publicar.
3. **Localización continua.** Se actualiza el contenido y se publica contenido nuevo con referencias del mercado de destino. Esta fase no termina nunca.

Aquí aparecen dos conceptos que conviene distinguir. **Localizar** es adaptar el contenido a las preferencias culturales y lingüísticas de un público. **Transcrear** va un paso más allá: mezcla traducción y redacción para transmitir el mismo mensaje con referencias propias del mercado.

Me ha gustado ver que el curso no plantea la IA y el traductor como alternativas. La traducción automática es una buena base, pero no el resultado final. La revisión de una persona nativa es lo que convierte un texto correcto en un texto que posiciona y convence.

## Lo que he aplicado en mi propia web

Al hacer las actividades del curso con mi web, me di cuenta de que mis páginas en alemán, italiano y catalán estaban traducidas, pero no localizadas. No había investigado cómo se busca en esos mercados. Así que he decidido quitarlas por ahora y redirigirlas a las versiones en español e inglés, que sí trabajo a fondo.

En un próximo artículo te contaré ese cambio con detalle y qué efecto ha tenido.

## Después de publicar: el seguimiento

La última idea del curso es que el SEO internacional no se deja funcionando solo. Una vez publicadas las versiones traducidas, hay que vigilar cada una:

- En **Google Search Console**, comprueba que Google rastrea e indexa las páginas nuevas y revisa sus posiciones en cada país.
- Con una herramienta de auditoría, como el Site Audit de Semrush o el de Ahrefs, revisa que el hreflang no tenga errores.
- En **Google Analytics**, mira las visitas y las conversiones por país.
- Cada vez que cambies o borres una URL, revisa que el hreflang de todas sus versiones apunte a la URL nueva.

## Mi siguiente meta

Con el curso de SEO internacional terminado, esta semana he empezado un curso sobre cómo escribir artículos con IA. Quiero entender bien qué partes del trabajo de contenido se pueden automatizar y cuáles necesitan a una persona detrás. De eso hablaré en el próximo artículo de esta serie.

## Resumen

| Pieza | Qué implica | Primer paso |
|---|---|---|
| Estructura | Cada idioma necesita su propio espacio en la web | Elige entre subcarpetas, subdominios o dominios por país |
| Hreflang | Google necesita saber qué versión mostrar a cada persona | Revisa que cada página enlace a sus versiones y estas le devuelvan el enlace |
| Contenido | Traducir no basta: hay que localizar | Investiga las palabras clave de cada mercado antes de traducir |
| Seguimiento | Cada versión necesita su propio control | Revisa Search Console y tu analítica por país |

## Cómo puedo ayudarte

Si quieres traducir tu web y que cada versión posicione en su mercado, puedes ver cómo trabajo la [traducción SEO](/servicios/traduccion) y el [SEO internacional](/servicios/seo), o [escribirme](/contacto) directamente.
