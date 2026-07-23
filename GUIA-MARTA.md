# 📝 Guía para Marta — Cómo usar tu web

¡Hola Marta! Esta guía te explica paso a paso cómo hacer cambios en tu web sin necesidad de saber programar. Todo lo que necesitas es tu navegador de internet y tu cuenta de usuario.

---

## 📋 Índice

1. [Cómo escribir un post en el blog](#-cómo-escribir-un-post-en-el-blog)
2. [Cómo cambiar textos de la web](#-cómo-cambiar-textos-de-la-web)
3. [Cómo cambiar fotos](#-cómo-cambiar-fotos)
4. [Cómo cambiar los colores de la web](#-cómo-cambiar-los-colores-de-la-web)
5. [Cómo funciona el formulario de contacto](#-cómo-funciona-el-formulario-de-contacto)
6. [Preguntas frecuentes](#-preguntas-frecuentes)

---

## ✍️ Cómo escribir un post en el blog

Tu blog tiene un editor visual (como WordPress) que se llama **Decap CMS**. No necesitas saber código — escribes como en un documento de Word.

### Paso a paso:

1. **Abre el editor del blog**
   - Ve a tu web y añade `/admin` al final de la dirección
   - Ejemplo: `https://marttelier.netlify.app/admin`

2. **Inicia sesión**
   - Usa tu cuenta de Netlify Identity (la misma que se configuró cuando se lanzó la web)
   - Si es la primera vez, recibirás un email de invitación — haz clic en el enlace del email

3. **Crea un nuevo post**
   - Haz clic en **"Blog Posts"** en el menú de la izquierda
   - Haz clic en **"New Blog Post"**

4. **Rellena los campos**
   - **Title**: El título de tu post
   - **Description**: Una frase corta que describe de qué va (aparece en la vista previa)
   - **Date**: La fecha del post
   - **Featured Image**: Una foto principal (opcional — haz clic para subir una)
   - **Tags**: Etiquetas como "ugc", "viajes", "personal" (separadas por comas)
   - **Language**: Elige el idioma del post (es, en, fr, de, it, ca)

5. **Escribe tu post**
   - En el cuadro grande de abajo, escribe tu contenido
   - Puedes usar **negrita**, *cursiva*, añadir enlaces y subir imágenes
   - El editor tiene botones arriba como en Word

6. **Publica**
   - Haz clic en **"Publish"** arriba a la derecha
   - Elige **"Publish now"**
   - ¡Listo! Tu post aparecerá en la web en unos 2-3 minutos (la web se reconstruye sola)

### Consejos para el blog:
- 🖼️ Las fotos se suben directamente desde el editor — no necesitas hacer nada más
- 📱 El post se verá bien en móvil y ordenador automáticamente
- 🔍 Escribe un buen título y descripción — ayuda a que te encuentren en Google (SEO)
- 🌍 Puedes escribir posts en diferentes idiomas eligiendo el idioma en el formulario

---

## 📝 Cómo cambiar textos de la web

Los textos de la web (menú, títulos, descripciones, etc.) están en archivos de traducción. Para cambiarlos necesitas entrar en GitHub (la plataforma donde está guardado el código de tu web).

### Paso a paso:

1. **Entra en GitHub**
   - Ve a `github.com` e inicia sesión con tu cuenta
   - Abre tu repositorio (la carpeta de tu web)

2. **Navega a los archivos de texto**
   - Haz clic en la carpeta `src`
   - Luego en `i18n`
   - Verás archivos como `es.json`, `en.json`, `fr.json`, etc.
   - Cada archivo es un idioma:
     - `es.json` = Español
     - `en.json` = Inglés
     - `fr.json` = Francés
     - `de.json` = Alemán
     - `it.json` = Italiano
     - `ca.json` = Catalán

3. **Edita el archivo**
   - Haz clic en el archivo del idioma que quieras cambiar (ej: `es.json`)
   - Haz clic en el **icono del lápiz** ✏️ (arriba a la derecha) para editar
   - Busca el texto que quieres cambiar
   - **¡IMPORTANTE!** Solo cambia el texto entre comillas `""`. No borres las comillas, las comas, ni las llaves `{}`. Ejemplo:

   ```
   ✅ Correcto:    "title": "Mi nuevo título"
   ❌ Incorrecto:  "title": Mi nuevo título
   ❌ Incorrecto:  title: "Mi nuevo título"
   ```

4. **Guarda los cambios**
   - Baja hasta abajo de la página
   - Escribe un mensaje corto describiendo qué cambiaste (ej: "Actualicé el texto de sobre mí")
   - Haz clic en **"Commit changes"** (es como darle a "Guardar")
   - ¡La web se actualizará sola en 2-3 minutos!

### Ejemplo práctico:

Si quieres cambiar tu descripción "Sobre mí", busca en `es.json`:

```json
"about": {
    "title": "Sobre mí",
    "text": "Soy Marta, creadora de contenido UGC y especialista en traducción..."
}
```

Cambia solo el texto entre las comillas de `"text"`.

---

## 🖼️ Cómo cambiar fotos e imágenes

Hay **dos formas** de cambiar las imágenes de la web:

### Opción A: Desde el panel de administración (la más fácil)

1. Ve a `marttelier.netlify.app/admin`
2. Inicia sesión
3. En el menú de la izquierda, haz clic en **"🖼️ Imágenes del sitio"**
4. Verás todos los campos de imagen organizados por sección:
   - **Foto principal (Hero)** — la foto grande de la portada
   - **Fotos del globo (Sobre mí)** — las fotos circulares sobre el globo
   - **Fondos de nicho** — las fotos de fondo de los cards de Viajes, Idiomas y Arte
   - **Iconos de nicho** — las imágenes 3D pequeñas (avión, globo, pincel)
   - **Captura de Instagram** — screenshot de tu perfil
   - **Fotos UGC** — tus fotos de portfolio por categoría
   - **Vídeos UGC** — tus vídeos por categoría
   - **Logos de herramientas** — los iconos de Microsoft Office, Google, etc.
   - **Redes sociales** — tus enlaces de LinkedIn e Instagram
5. Haz clic en el campo que quieras cambiar → sube la imagen
6. Haz clic en **"Publish"**

⚠️ **Importante**: cada vez que publicas, gasta 1 crédito de construcción. Si te quedan pocos créditos, usa la Opción B.

---

### Opción B: Subir fotos directamente en GitHub (ahorra créditos)

Esta opción es un poco más manual pero te permite subir MUCHAS imágenes gastando solo 1 crédito.

#### Paso 1: Sube las imágenes a la carpeta correcta

1. Entra en **GitHub** → tu repositorio
2. Navega a la carpeta donde va la imagen:

| Tipo de imagen | Carpeta en GitHub |
|---|---|
| Foto principal, fotos del globo, fondos de nicho, iconos, Instagram | `public` → `images` → `site` |
| Fotos de tu portfolio UGC | `public` → `images` → `ugc` |
| Logos de herramientas | `public` → `images` → `tools` |
| Fotos del blog | `public` → `images` → `blog` |

3. Haz clic en **"Add file"** → **"Upload files"**
4. Arrastra todas las imágenes que quieras subir
5. **¡NO le des a "Commit" todavía!** Primero necesitas hacer el Paso 2.

Si ya le diste a Commit, no pasa nada — simplemente haz el Paso 2 como un commit separado.

#### Paso 2: Dile a la web DÓNDE usar cada imagen

La web necesita saber qué imagen va en cada sitio. Para eso, editas un archivo que se llama `images.json`.

1. En GitHub, navega a `src` → `data` → `images.json`
2. Haz clic en el **lápiz** ✏️ para editar
3. Busca el campo que quieres cambiar y pon la ruta de tu imagen

**Ejemplo: cambiar la foto principal del Hero**

Busca esta línea:
```
"heroMainPhoto": "/images/site/img_5587.jpg",
```

Cámbiala por el nombre de tu nueva foto:
```
"heroMainPhoto": "/images/site/mi-nueva-foto.jpg",
```

**Ejemplo: añadir fotos al portfolio UGC**

Busca esta parte:
```
"ugcPhotos": {
    "travel": [],
    "languages": [],
    "art": [],
    "all": []
}
```

Para añadir fotos a "todas", cambia `"all": []` por:
```
"all": [
    "/images/ugc/foto1.jpg",
    "/images/ugc/foto2.jpg",
    "/images/ugc/foto3.jpg"
]
```

**Ejemplo: cambiar el fondo del card de Viajes**

Busca:
```
"nicheBackgrounds": {
    "travel": "",
```

Cámbialo por:
```
"nicheBackgrounds": {
    "travel": "/images/site/fondo-viajes.jpg",
```

#### Reglas importantes para editar images.json:

```
✅ Correcto:    "/images/site/mi-foto.jpg"
❌ Incorrecto:  mi-foto.jpg  (falta la ruta completa)
❌ Incorrecto:  /images/site/mi-foto.jpg  (sin comillas)
```

- La ruta SIEMPRE empieza con `/images/`
- El nombre del archivo debe ser EXACTAMENTE igual al que subiste (mayúsculas, minúsculas, guiones, todo)
- No borres las comas `,` ni las llaves `{}` ni los corchetes `[]`
- Para una lista de fotos, cada ruta va entre comillas y separada por comas
- Para un campo vacío (sin imagen), déjalo como `""`

#### Guía rápida de todos los campos:

| Campo en images.json | Qué es | Ejemplo |
|---|---|---|
| `heroMainPhoto` | Foto grande de la portada | `"/images/site/marta-hero.jpg"` |
| `galleryCutouts.shotOne` (hasta `shotFour`) | Fotos circulares del globo | `"/images/site/foto-globo-1.jpg"` |
| `instagramScreenshot` | Captura de tu Instagram | `"/images/site/instagram.png"` |
| `nicheBackgrounds.travel` | Fondo del card Viajes | `"/images/site/fondo-viajes.jpg"` |
| `nicheBackgrounds.languages` | Fondo del card Idiomas | `"/images/site/fondo-idiomas.jpg"` |
| `nicheBackgrounds.art` | Fondo del card Arte | `"/images/site/fondo-arte.jpg"` |
| `nicheIcons.travel` | Icono 3D del avión | `"/images/site/avion-3d.png"` |
| `nicheIcons.languages` | Icono 3D del globo | `"/images/site/globo-3d.png"` |
| `nicheIcons.art` | Icono 3D del pincel | `"/images/site/pincel-3d.png"` |
| `ugcPhotos.all` | Todas las fotos UGC | `["/images/ugc/f1.jpg", "/images/ugc/f2.jpg"]` |
| `ugcPhotos.travel` | Fotos UGC de viajes | `["/images/ugc/viaje1.jpg"]` |
| `ugcVideos.travel` | Vídeos UGC de viajes | `["/images/ugc/video1.mp4"]` |
| `brandVideo` | Vídeo de marca personal | `"/images/site/marca-personal.mp4"` |
| `socialLinks.linkedin` | Tu URL de LinkedIn | `"https://www.linkedin.com/in/martagall/"` |
| `socialLinks.instagram` | Tu URL de Instagram | `"https://www.instagram.com/marttelier/"` |

4. Baja y haz clic en **"Commit changes"** para guardar

#### 💡 Truco para ahorrar créditos:

Sube TODAS las imágenes y edita el `images.json` todo de una vez. Así solo se gasta 1 crédito por cada vez que guardas, no 1 por cada imagen.

### Consejos para fotos:
- 📐 Usa fotos en buena calidad pero no demasiado pesadas (máximo 1-2 MB por foto)
- 📸 Formatos recomendados: `.jpg`, `.png`, `.webp`
- 📏 Para la foto principal del hero: usa formato vertical (tipo retrato)
- 📏 Para los vídeos: usa formato 9:16 (vertical, como un reel de Instagram)
- 🏷️ Usa nombres de archivo simples, sin espacios ni caracteres especiales (usa guiones: `mi-foto.jpg`)

---

## 🎨 Cómo cambiar los colores de la web

Los colores se definen en un solo archivo. ¡Cambiar un color cambia toda la web automáticamente!

### Paso a paso:

1. **En GitHub**, navega a `src` → `styles` → `global.css`
2. Haz clic en el **lápiz** ✏️ para editar
3. Busca la sección que dice `@theme {` — ahí están todos los colores
4. Cambia los códigos de color (los que empiezan por `#`)

### Los colores principales:

| Variable | Qué controla | Color actual |
|---|---|---|
| `--color-blush-50` | Fondo rosa muy clarito | `#FFF5F5` |
| `--color-blush-100` | Fondo rosa suave | `#F9E4E4` |
| `--color-blush-200` | Bordes y acentos | `#F2C4C4` |
| `--color-rose-gold` | Color de acento principal | `#B76E79` |
| `--color-charcoal` | Texto principal (oscuro) | `#2D2D2D` |
| `--color-cream` | Fondo de la página | `#FFFAF8` |

### ¿Cómo encuentro códigos de color?
- Ve a [Google Color Picker](https://g.co/kgs/aVEqfYP)
- Elige el color que te gusta
- Copia el código que empieza por `#` (ej: `#F5D0C5`)
- Pégalo en el archivo en lugar del color anterior

5. **Guarda** con "Commit changes"

---

## 📬 Cómo funciona el formulario de contacto

Tu web tiene **dos formularios de contacto** — uno para UGC y otro para Traducción + SEO.

### ¿Cómo te llegan los mensajes?

Los formularios están conectados a **Netlify** (la plataforma donde está alojada tu web). Cuando alguien rellena un formulario:

1. El mensaje se guarda automáticamente en Netlify
2. **Si configuras notificaciones por email**, recibirás un email cada vez que alguien te escriba

### Cómo configurar notificaciones por email:

1. Entra en **[Netlify](https://app.netlify.com)** con tu cuenta
2. Selecciona tu web
3. Ve a **Site configuration** → **Forms** → **Form notifications**
4. Haz clic en **"Add notification"** → **"Email notification"**
5. Escribe tu email donde quieras recibir los mensajes
6. Elige el formulario (`ugc-contact` o `seo-contact`) o déjalo en blanco para recibir de ambos
7. ¡Listo! A partir de ahora recibirás un email con cada mensaje

### ¿Dónde puedo ver los mensajes que me han enviado?

- En **Netlify** → tu web → **Forms** verás todos los mensajes recibidos organizados por formulario

---

## ❓ Preguntas frecuentes

### "He hecho un cambio pero no se ve en la web"
> Espera 2-3 minutos. Cada vez que guardas un cambio en GitHub, la web se reconstruye automáticamente. Si después de 5 minutos no se ve, entra en Netlify → Deploys y comprueba que no haya un error.

### "Me he equivocado editando un archivo y la web se ha roto"
> No te preocupes. En GitHub, cada cambio queda guardado. Ve al archivo, haz clic en "History" y podrás volver a una versión anterior.

### "¿Puedo añadir una nueva sección a la web?"
> Eso requiere un poco más de conocimiento técnico. Lo mejor es pedirle a un desarrollador que lo haga.

### "¿Puedo cambiar las fuentes (tipografías)?"
> Sí. En el archivo `src/styles/global.css`, busca `--font-heading` y `--font-body`. Puedes cambiar los nombres de las fuentes por cualquier fuente de [Google Fonts](https://fonts.google.com).

### "¿Cuánto cuesta mantener la web?"
> ¡Nada! Netlify es gratis para este tipo de web. No hay coste mensual. Solo pagarías si quisieras un dominio personalizado (ej: martagallardo.com), que cuesta unos 10-15€/año.

### "¿Puedo hacer la web privada?"
> Sí. El código puede estar en un repositorio privado en GitHub y seguirá funcionando en Netlify igual.

---

## 🆘 Si necesitas ayuda

Si algo no funciona o necesitas hacer un cambio grande, contacta con el desarrollador que creó la web. Para cambios pequeños (textos, fotos, colores, posts del blog), ¡esta guía debería ser suficiente!

Recuerda: los cambios que hagas en GitHub se publican automáticamente en 2-3 minutos. No necesitas hacer nada más después de darle a "Commit changes".
