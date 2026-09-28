import { Router } from 'express';
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} from '../controllers/asset.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

// Module 13: Wadaan Asset Inventory
router.post('/', createAsset);
router.get('/', getAllAssets);
router.get('/:id', getAssetById);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;
