// Keep the existing dashboard backend isolated from Vite's module reloads.
const app = require('../aresnav-mars-main/backend/server.js');
app.listen({ port: 0, host: '127.0.0.1' }).then(() => {
  process.send?.({ port: app.server.address().port });
}).catch(() => process.exit(1));
process.on('disconnect', () => { void app.close().finally(() => process.exit(0)); });
