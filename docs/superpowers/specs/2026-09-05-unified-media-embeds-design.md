# Unified Media Embeds Design

## Goal

Make video media controls consistent across the Home brand video, UGC, and
orbit editors. Marta can paste a provider URL or iframe snippet for any video
slot, while existing local uploads, posters, layouts, and published assets
continue to work unchanged. Home and UGC have focused playback surfaces; orbit
tiles keep their current poster/local-video behavior to avoid changing the
animated layout.

## Design

- Reuse `toEmbedUrl` as the single parser for pasted URLs and iframe snippets.
- Add optional embed values to UGC and orbit video records. Existing `src`
  paths remain the local-upload fallback and are not migrated.
- Match the Home admin field: show the embed input only for video slots,
  preview valid embeds, and provide a clear action to return to the uploaded
  file.
- Keep UGC and orbit video posters as local image uploads. Posters continue to
  power admin previews, thumbnails, reduced-motion behavior, and loading states.
- Preserve image-only, tool-logo, and blog media controls because embeds do not
  apply to them.

## Public behavior

The existing media frame and surrounding layout remain unchanged. Home and the
UGC focused viewer use the normalized embed URL when present; otherwise they
render the current local video source. UGC and orbit thumbnails continue to use
their poster rather than loading remote embeds in the moving/contact-sheet
previews. Orbit remains a moving tile collection with its current local-video
or poster rendering; it does not gain a new modal in this change.

## Persistence and validation

Embed values flow through the existing admin draft and site-data publishing
path. Empty values clear the embed and restore local-video behavior. Invalid,
malformed, or non-HTTP(S) values are rejected without replacing the current
media. Existing file type, size, poster, and pending-upload validation remains
in force for local files.

## Verification

Add focused coverage for the new record fields, fallback precedence, and
rendering contracts. Run the existing targeted tests, full test command, and
production build. Confirm `src/data/site.json` media paths and repository
assets are unchanged except for intentional schema values.
