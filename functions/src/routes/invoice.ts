import { Router } from 'express';
import {
  getInvoice,
  streamInvoicePDF,
  adminGenerateInvoice,
  adminRegenerateInvoice
} from '../controllers/invoice';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Customer / General Invoice Routes
router.get('/orders/:orderId/invoice', authenticateToken, getInvoice);
router.get('/orders/:orderId/invoice/stream', optionalAuthenticateToken, streamInvoicePDF);
router.get('/stream/:orderId', optionalAuthenticateToken, streamInvoicePDF);

// Admin Specific Invoice Routes
router.get('/admin/invoices/:orderId', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), getInvoice);
router.get('/admin/invoices/stream/:orderId', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), streamInvoicePDF);
router.post('/admin/invoices/generate/:orderId', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), adminGenerateInvoice);
router.post('/admin/invoices/regenerate', authenticateToken, requireRole(['Admin', 'Manager', 'Super Admin']), adminRegenerateInvoice);

export default router;
