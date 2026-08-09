import { Router } from 'express';
import { generateAndSaveSupportRequest, uploadAttachment } from '../controllers/support';
import { upload } from '../middleware/upload';
import { validateUploadedFile } from '../middleware/fileUploadSecurity';

const router = Router();

router.post('/request', generateAndSaveSupportRequest);
router.post('/upload', upload.single('file'), validateUploadedFile, uploadAttachment);

export default router;
