# Marta Gallardo Portfolio

Welcome! This website is Marta Gallardo's portfolio for **UGC** and **Translation/SEO** services.  
It includes the main pages of the site, a blog, multilingual content, and an admin area so Marta can update blog posts herself.

## Tech stack

This site is built with:

- **Astro**
- **React**
- **Tailwind CSS**
- **Framer Motion**
- **Decap CMS**
- **Netlify**

You do not need to understand the code to update the blog and basic content.

---

## How to update blog posts

The blog is managed through **Decap CMS**.

1. Go to **`https://yoursite.netlify.app/admin`**
2. Log in with **Netlify Identity**
3. Click **“New Blog Post”**
4. Fill in:
   - **Title**
   - **Description**
   - **Date**
   - **Featured Image**
   - **Tags**
   - **Language**
5. Write your post in the editor
6. Click **“Publish”**
7. The website will **auto-rebuild** and publish the new post

[screenshot: admin login]  
[screenshot: admin panel]  
[screenshot: new blog post form]

### Important note

- Blog images are uploaded through the CMS and stored in `public/images/blog/`
- If the admin area does not let you log in, check that **Netlify Identity** is enabled in Netlify

---

## How to change colors

To change the color palette, open:

`src/styles/global.css`

Look for the `@theme` section near the top of the file.

These variables control the main colors:

- `--color-blush-50` → very light pink backgrounds
- `--color-blush-100` → soft pink backgrounds and borders
- `--color-blush-200` → slightly stronger pink accents/borders
- `--color-blush-300` → medium pink accents
- `--color-blush-400` → deeper pink accents
- `--color-rose-gold` → rose-gold highlight color
- `--color-charcoal` → main dark text
- `--color-warm-gray` → secondary text
- `--color-cream` → page background
- `--color-white` → white cards/backgrounds

### Example: change `blush-100`

Current:

```css
--color-blush-100: #F9E4E4;
```

If you want a slightly different shade, you could change it to:

```css
--color-blush-100: #F4DADA;
```

Save the file, commit the change, and Netlify will redeploy the site after the push.

[screenshot: global.css theme colors]

---

## How to change text content

Most text for the site lives in:

`src/i18n/`

Language files:

- `es.json` = Spanish
- `en.json` = English
- `fr.json` = French
- `de.json` = German
- `it.json` = Italian
- `ca.json` = Catalan

To update text:

1. Open the correct JSON file
2. Find the text you want to change
3. Edit the value
4. Save the file
5. Commit and push the change

Example:

```json
"contact": {
  "title": "Colaboremos"
}
```

You can change `"Colaboremos"` to any new wording you want.

[screenshot: i18n json file]

---

## How to add or change photos

Images are stored in:

`public/images/`

To update a photo:

1. Open `public/images/`
2. Replace the image file you want to change
3. If possible, keep the **same file name** so the site keeps using it automatically
4. Save, commit, and push

For blog images added through the CMS, the images go into:

`public/images/blog/`

[screenshot: images folder]

---

## How to update experience or education

Open:

`src/pages/translation-seo.astro`

This file contains the content for the **Translation + SEO** page, including:

- education
- experience
- skills
- summary text

Find the text you want to update and edit it directly.

> Note: this project also contains language-specific versions of this page in folders like `src/pages/en/`, `src/pages/fr/`, etc. If you want the same change to appear in those languages too, update those files as well.

[screenshot: translation-seo.astro content blocks]

---

## How deployment works

- The site **auto-deploys every time you push to `main`**
- Netlify builds the site and publishes the new version automatically

### For Decap CMS to work

In Netlify:

1. Enable **Netlify Identity**
2. Enable **Git Gateway**
3. Invite yourself as a user if needed

Once that is set up, you can manage blog posts from `/admin`.

[screenshot: netlify identity settings]

---

## Local development (for a developer)

If a developer needs to run the site locally:

```bash
npm install
npm run dev
npm run build
```

---

## Quick summary

If you only remember four things:

1. **Blog posts** → use `/admin`
2. **Text** → edit `src/i18n/*.json`
3. **Photos** → replace files in `public/images/`
4. **Colors** → edit the `@theme` section in `src/styles/global.css`

