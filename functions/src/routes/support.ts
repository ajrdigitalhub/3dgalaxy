import { Router } from 'express';
import { generateAndSaveSupportRequest, uploadAttachment } from '../controllers/support';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/request', generateAndSaveSupportRequest);
router.post('/upload', upload.single('file'), uploadAttachment);

export default router;
