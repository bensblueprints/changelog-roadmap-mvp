const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5311;
const app = createApp();

app.listen(PORT, () => {
  console.log('Shipnotes running');
  console.log(`  Changelog : http://localhost:${PORT}/`);
  console.log(`  Roadmap   : http://localhost:${PORT}/roadmap`);
  console.log(`  Admin     : http://localhost:${PORT}/admin`);
});
