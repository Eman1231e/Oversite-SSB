// ER:LC API adapter.
// Keep all PRC-specific HTTP behavior in this file so auth/API changes do not
// infect tickets, sessions, or the setup UI.

export async function validateErlcKey(serverKey) {
  if (!serverKey || serverKey.trim().length < 8) {
    return { ok: false, message: 'That key looks too short.' };
  }

  // TODO: Wire this to the CURRENT official PRC API contract before production.
  // Do not log serverKey. Do not include it in thrown errors.
  return { ok: true, message: 'Key saved. Live API validation will be enabled in the ER:LC API module.' };
}

export async function getErlcStatus(_serverKey) {
  // Safe placeholder until official endpoint/auth details are configured.
  return {
    connected: true,
    players: null,
    staff: null,
    queue: null,
    serverName: null
  };
}
