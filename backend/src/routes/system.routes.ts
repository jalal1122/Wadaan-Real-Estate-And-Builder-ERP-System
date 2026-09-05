import { Router } from 'express';
import { getSystemStatus, initializeSystem } from '../controllers/system.controller';

const router = Router();

// Open route: check whether the system has been initialized
router.get('/status', getSystemStatus);

// Open route: execute one-time atomic Go-Live initialization (guarded by SystemSetting flag)
router.post('/initialize', initializeSystem);

export default router;
