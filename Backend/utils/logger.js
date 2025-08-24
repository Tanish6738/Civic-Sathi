'use strict';

function log(level, cid, msg, meta) {
  const base = { ts: new Date().toISOString(), level, cid, msg };
  if (meta) Object.assign(base, { meta });
  console.log(JSON.stringify(base));
}

module.exports = {
  info: (cid, msg, meta) => log('info', cid, msg, meta),
  warn: (cid, msg, meta) => log('warn', cid, msg, meta),
  error: (cid, msg, meta) => log('error', cid, msg, meta)
};
