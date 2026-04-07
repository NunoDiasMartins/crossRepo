import cors from 'cors';
import express from 'express';
import agentRoutes from './routes/agentRoutes.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());
app.use('/api/agent', agentRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'agent-runtime-server' });
});

app.listen(port, () => {
  console.log(`AG-UI backend server listening on http://localhost:${port}`);
});
