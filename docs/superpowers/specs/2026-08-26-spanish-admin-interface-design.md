# Spanish Admin Interface Design

## Goal

Make the entire fixed admin interface understandable in Spanish without
changing any user-authored multilingual website content.

## Included copy

Translate hardcoded editor chrome and operational messages:

- Floating Edit toolbar, navigation-label section, language visibility, draft,
  publish, success, warning, and exit controls.
- Collection add/edit/move/save/cancel controls and validation errors.
- Orbit, UGC, Arsenal, Experience/Education, image, video, and poster help text.
- Blog creation fields, toolbar controls, image help, outline help, submission
  states, and operational errors.
- Admin-only page headings and descriptions that currently remain in English.
- Upload alerts and accessible labels used by editor controls.

Editable public copy from locale JSON remains untouched. ES, EN, and FR codes
and language names remain recognizable as language choices.

## Draft wording

The pending-upload warning must explain that text and metadata are stored in
the browser, but binary files are not:

> Borrador guardado localmente. Si recargas antes de publicar, tendrás que
> volver a seleccionar 1 archivo pendiente.

Plural wording uses “archivos pendientes”. Publishing without reloading does
not require reselection.

## Implementation

Use direct Spanish literals in the existing admin components and admin-facing
validation helpers. Do not add an admin translation framework or dependency.

Regression checks scan the admin surfaces for the approved Spanish toolbar and
draft wording and for known remaining English operational strings. Site locale
content and public rendering remain unchanged.
