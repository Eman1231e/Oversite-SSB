import Database from 'better-sqlite3';

const db = new Database('data/oversite.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_config (
  guild_id TEXT PRIMARY KEY,
  embed_color TEXT NOT NULL DEFAULT '#5865F2',
  ticket_panel_channel_id TEXT,
  ticket_category_id TEXT,
  ticket_support_role_id TEXT,
  ticket_log_channel_id TEXT,
  session_channel_id TEXT,
  session_ping_role_id TEXT,
  session_log_channel_id TEXT,
  erlc_key_encrypted TEXT,
  active_session INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bot_resources (
  guild_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  channel_id TEXT,
  message_id TEXT,
  PRIMARY KEY (guild_id, resource_type, message_id)
);
`);

export function getConfig(guildId) {
  db.prepare(`INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)`).run(guildId);
  return db.prepare(`SELECT * FROM guild_config WHERE guild_id = ?`).get(guildId);
}

export function setConfig(guildId, patch) {
  getConfig(guildId);
  const allowed = new Set([
    'embed_color',
    'ticket_panel_channel_id','ticket_category_id','ticket_support_role_id','ticket_log_channel_id',
    'session_channel_id','session_ping_role_id','session_log_channel_id',
    'erlc_key_encrypted','active_session'
  ]);
  const entries = Object.entries(patch).filter(([k]) => allowed.has(k));
  if (!entries.length) return getConfig(guildId);
  const sql = `UPDATE guild_config SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE guild_id = ?`;
  db.prepare(sql).run(...entries.map(([,v]) => v), guildId);
  return getConfig(guildId);
}

export function trackResource(guildId, type, channelId, messageId) {
  db.prepare(`INSERT OR REPLACE INTO bot_resources VALUES (?, ?, ?, ?)`)
    .run(guildId, type, channelId, messageId);
}

export function getResources(guildId, prefix = 'session_') {
  return db.prepare(`SELECT * FROM bot_resources WHERE guild_id = ? AND resource_type LIKE ?`)
    .all(guildId, `${prefix}%`);
}

export function removeResource(guildId, type, messageId) {
  db.prepare(`DELETE FROM bot_resources WHERE guild_id = ? AND resource_type = ? AND message_id = ?`)
    .run(guildId, type, messageId);
}

export function clearSessionConfig(guildId) {
  // INTENTIONALLY DOES NOT TOUCH ANY TICKET CONFIG OR TICKET CHANNELS.
  setConfig(guildId, {
    erlc_key_encrypted: null,
    session_channel_id: null,
    session_ping_role_id: null,
    session_log_channel_id: null,
    active_session: 0
  });
  db.prepare(`DELETE FROM bot_resources WHERE guild_id = ? AND resource_type LIKE 'session_%'`).run(guildId);
}
