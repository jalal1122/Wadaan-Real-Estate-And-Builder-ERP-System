import { Router } from 'express';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProjectStatus
} from '../controllers/project.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Screen 4: Projects
router.post('/', createProject);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.patch('/:id/status', updateProjectStatus);

export default router;
