import { Router } from 'express';

const router = Router();

// Placeholder - implementar dashboard customizável
router.get('/', async (_req, res) => {
  res.json({ status: 'success', message: 'Dashboard routes - to be implemented' });
});

export default router;
