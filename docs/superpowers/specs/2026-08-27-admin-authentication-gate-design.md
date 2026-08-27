# Admin Authentication Gate Design

## Root cause

Production admin pages currently initialize without a Netlify Identity user.
They allow edits but provide no login control or session status. Publishing then
fails with “Debes iniciar sesión antes de publicar.”

The existing token refresh fixes expired one-hour access tokens only while a
valid Identity session still exists. It cannot refresh an absent or fully
expired login session.

## Production access

Production admin pages require an active Netlify Identity session before their
editing interface is usable.

- Existing valid sessions open the admin without interruption.
- Missing sessions automatically open the Netlify login window.
- A full-screen Spanish gate remains available with an **Iniciar sesión**
  button if the modal is closed.
- Localhost and loopback development retain tokenless preview access.

## Session expiry while editing

Access tokens continue refreshing silently before repository operations.

If the full Identity session can no longer refresh:

- The stored auth token is cleared.
- The login gate appears again.
- It explicitly states that in-memory edits remain in the current tab.
- Signing in restores publishing without reloading or discarding edits.

Logout also clears the admin token and returns to the gate.

## Toolbar guidance

The Edit toolbar shows authentication state and actionable Spanish copy:

- **Sesión activa** when repository publishing is available.
- **Inicia sesión para publicar** when authentication is missing.
- **Guardar borrador** explains that text/settings are stored in this browser,
  while files must be selected again after a reload.
- **Publicar cambios** explains that changes are sent to the repository and the
  public website rebuilds afterward.

Publishing is disabled while unauthenticated. Error messages name the cause,
the next action, and whether unsaved work remains safe.

## Checks

Regression coverage includes:

- Production never initializes tokenless.
- Local development still initializes tokenless.
- Login automatically opens when Identity initializes without a user.
- Login and logout events update store authentication state.
- Refresh failures clear authentication but preserve dirty/pending state.
- The gate blocks production editing and disappears after login.
- Toolbar login/status/help controls are actionable and Spanish.
