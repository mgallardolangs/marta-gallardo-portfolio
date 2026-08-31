# 📝 Guía para Marta — cómo editar tu web

Hola Marta. Esta web se gestiona desde un **panel interno en `/admin`**. Ya no usa Decap CMS: todo lo que puedes editar desde navegador está integrado dentro de la propia web.

---

## 1. Dónde entrar

- **Panel principal:** `https://marttelier.netlify.app/admin`
- **UGC:** `https://marttelier.netlify.app/admin/ugc`
- **Traducción + SEO:** `https://marttelier.netlify.app/admin/translation-seo`
- **Contacto:** `https://marttelier.netlify.app/admin/contact`
- **Blog:** `https://marttelier.netlify.app/admin/blog`
- **Nuevo post:** `https://marttelier.netlify.app/admin/blog/new`

Si estás en local o en una preview, cambia solo el dominio y deja la misma ruta `/admin`.

---

## 2. Qué idiomas puedes editar desde el panel

### Editables en `/admin`
- **ES**
- **EN**
- **FR**

### No editables desde el panel
- **DE**
- **IT**
- **CA**

Estos tres últimos siguen siendo **idiomas gestionados por código**. Si quieres cambiar su texto o crear contenido nuevo específico para esos idiomas, hay que actualizar el repositorio.

---

## 3. Cómo funciona el panel

### Iniciar sesión
1. Entra en cualquier ruta `/admin`.
2. Inicia sesión con **Netlify Identity**.
3. Sin login puedes ver el entorno, pero **publicar cambios** requiere autenticación.

### Botón “✏️ Edit”
Abajo a la derecha verás un botón flotante:
- **ES / EN / FR**: cambia el idioma que estás editando.
- **💾 Save draft**: guarda un borrador en tu navegador.
- **🚀 Publish changes**: publica los cambios en el repositorio y lanza la rebuild.

### Drafts (borradores)
- Los borradores se guardan en **tu navegador**.
- Si recargas la página, el texto vuelve.
- **Importante:** los archivos pendientes de subida (imágenes/vídeos/logos) **no se guardan completos en local**. Si cierras o recargas, tendrás que **volver a seleccionarlos** antes de publicar.

### Publish
Cuando publicas, el panel guarda:
- textos traducidos de **ES/EN/FR**
- `src/data/site.json` si cambias datos del sitio
- archivos subidos (imágenes, vídeos, logos)
- posts nuevos del blog en Markdown

Después de publicar, Netlify reconstruye la web. Lo normal es que tarde unos minutos.

---

## 4. Qué puedes cambiar en cada zona

## Inicio (`/admin`)
Aquí puedes editar:
- textos de portada
- foto principal
- textos “sobre mí”
- etiquetas de idiomas del bloque about
- captura de Instagram
- stickers visuales
- vídeo principal de marca
- colección del **orbit**

### Orbit de portada
El orbit sí tiene controles dinámicos:
- añadir elemento
- quitar elemento
- mover arriba / abajo
- cambiar tipo: **imagen** o **vídeo**
- editar enlace interno (`/contact`, `/blog`, etc.)
- editar **label** y **alt** en ES/EN/FR
- subir **poster** obligatorio cuando el elemento es vídeo

### Vídeo principal de marca (portada)
Tienes **dos formas** de ponerlo:
- **Enlace o código para incrustar** (recomendado para vídeos en alta calidad de 30–50 MB o más): copia el enlace del vídeo (**YouTube, Vimeo, Instagram, TikTok…**) o su código `<iframe>` y **pégalo** en el campo del vídeo de marca. La web lo muestra incrustado, carga rápido y no ocupa espacio en el repositorio.
- **Archivo subido** (MP4/WebM/MOV, máximo **8 MB**): si no pones enlace, se usa el archivo que subas.

El enlace tiene prioridad sobre el archivo. Para volver al archivo, pulsa **“Quitar enlace y usar archivo subido”**. Si dejas ambos vacíos, se muestra el marcador de posición actual.

### Reglas del orbit
- **Imágenes orbit:** JPG, PNG, WebP o GIF, máximo **2 MB**
- **Vídeos orbit:** MP4, WebM o MOV, máximo **8 MB**
- Cada vídeo necesita **poster**
- DE/IT/CA heredan el valor en español hasta que se actualicen por código

---

## UGC (`/admin/ugc`)
Aquí puedes editar:
- textos de la página UGC
- etiquetas e intros de los nichos
- iconos de nicho

Puedes revisar las galerías y vídeos publicados, pero el panel actual **no añade ni reordena automáticamente** las listas de fotos/vídeos UGC. Si quieres cambiar esas colecciones completas, hay que hacerlo en el repositorio.

---

## Traducción + SEO (`/admin/translation-seo`)
Aquí puedes editar:
- textos de la hero
- CTAs
- servicios
- educación / experiencia
- metodología
- bloques “why choose me”

También puedes gestionar de forma dinámica el bloque **arsenal**:

### Idiomas
- añadir
- quitar
- reordenar
- editar nombre y nivel en ES/EN/FR

### Herramientas
- añadir
- quitar
- reordenar
- editar nombre en ES/EN/FR
- subir logo

### Skills
- añadir
- quitar
- reordenar
- editar texto en ES/EN/FR

### Reglas de logos de herramientas
- formatos: JPG, PNG, WebP, GIF o SVG
- tamaño máximo: **2 MB**

Como en el orbit, los valores de **DE/IT/CA** no se editan aquí: siguen siendo gestionados por código.

---

## Contacto (`/admin/contact`)
Aquí puedes editar los textos de:
- cabecera
- subtítulo
- formulario UGC
- formulario Traducción + SEO
- mensajes de éxito
- botón de envío

Los formularios siguen enviándose desde la web pública; este panel cambia el contenido visible, no la lógica técnica del envío.

---

## 5. Blog

## Ver posts existentes
En `/admin/blog` ves el listado actual de posts.

## Crear un post nuevo
Entra en `/admin/blog/new`.

Campos disponibles:
- **Title**
- **Description**
- **Date**
- **Tags**
- **Language**
- **Markdown body**
- **Slug** (se genera automáticamente desde el título)

### Alcance real del blog en admin
- Solo puedes crear posts en **ES, EN o FR**
- **DE, IT y CA** no se crean desde este formulario
- El post se guarda como archivo Markdown en el repositorio

### Importante sobre el blog
El formulario actual está pensado para crear el contenido principal del post. Si quieres añadir configuraciones más avanzadas o contenido fuera del flujo normal del editor, habrá que tocar el repositorio.

---

## 6. Formatos de archivos

### Imágenes generales del sitio
Aceptadas en el editor visual:
- JPG
- PNG
- WebP
- GIF
- SVG

### Vídeos gestionados desde el panel
Aceptados:
- MP4
- WebM
- MOV / QuickTime

### Límites que sí están controlados en el panel
- Orbit imágenes: **2 MB**
- Orbit vídeos: **8 MB**
- Logos de herramientas: **2 MB**

Consejo: aunque un archivo se deje subir, intenta usar archivos ligeros para que la web cargue rápido.

### Cómo preparar las imágenes (calidad alta + carga rápida)

La web ya **optimiza las imágenes automáticamente** al mostrarlas: las redimensiona y las sirve en el formato más ligero para cada navegador (WebP/AVIF) **sin tocar tu archivo original**. Así que no hace falta que conviertas todo a mano.

Lo único importante al subir:

- **No subas archivos enormes.** Lo que más pesa no es el formato, sino el tamaño en píxeles. Antes de subir, deja la imagen en como mucho **~2000 px de ancho** (menos para fotos pequeñas o stickers).
- **Si conviertes a WebP, usa calidad ~80** (con “lossy”, no “sin pérdidas / lossless” ni calidad 100). Con calidad máxima el WebP suele salir **más pesado** que el JPG.
- **Si el WebP te sale más grande que el JPG, quédate con el JPG.** WebP no es obligatorio; la web lo optimiza igual al servirlo.
- **HEIC (fotos del iPhone): conviértelas antes de subir** a **JPG** (calidad ~80) o WebP. Los navegadores no muestran HEIC y la web no puede optimizarlo directamente. Además, pasar de HEIC a WebP casi siempre pesa más, así que JPG es la opción más segura.

Herramienta gratis recomendada: **[squoosh.app](https://squoosh.app)** — elige WebP o JPG, calidad ~80, y ajusta el ancho; te muestra el peso antes/después.

Diferencia rápida: **“reducir el tamaño”** es que el archivo pese menos; **“optimizar para la web”** es que cargue rápido para quien visita (tamaño adecuado + mejor formato + compresión + carga diferida + CDN). La web ya hace lo segundo por ti; tú solo evita subir originales gigantes.

---

## 7. Qué NO se gestiona desde `/admin`

Necesitan cambios en repositorio/código:
- textos en **DE / IT / CA**
- posts nuevos en **DE / IT / CA**
- cambios estructurales de diseño o navegación
- rutas nuevas
- cambios técnicos del formulario
- cambios complejos fuera de los controles existentes
- colecciones UGC que hoy no tengan control de edición directo

---

## 8. Flujo recomendado

1. Entra en la ruta `/admin` que corresponda.
2. Inicia sesión.
3. Cambia el idioma ES / EN / FR si hace falta.
4. Edita textos o sube archivos.
5. Si no vas a terminar ahora, pulsa **Save draft**.
6. Revisa todo.
7. Pulsa **Publish changes**.
8. Espera la rebuild de Netlify.

---

## 9. Resumen rápido

- El panel actual es **inline `/admin`**, no Decap.
- **ES/EN/FR** se editan desde navegador.
- **DE/IT/CA** siguen por código.
- El orbit, los idiomas, las herramientas y las skills tienen controles dinámicos.
- Los borradores viven en tu navegador.
- Las subidas pendientes hay que reseleccionarlas tras recargar.
- Publicar guarda en repositorio y reconstruye la web.

Si necesitas cambiar algo y no ves control para ello en `/admin`, esa parte sigue siendo de mantenimiento técnico.
