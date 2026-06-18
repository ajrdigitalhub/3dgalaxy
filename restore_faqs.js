const fs = require('fs');
let code = fs.readFileSync('server/src/routes/admin.ts', 'utf-8');

const faqsCode = `
// -------------------------------------------------------------
// 8. CMS FAQS OPERATIONS
// -------------------------------------------------------------
router.get('/faqs', async (req: Request, res: Response) => {
  try {
    const user = await lenientAuth(req);
    const isPrivileged = user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager');
    const condition = isPrivileged ? {} : { isPublished: true };
    const list = await prisma.faq.findMany({ where: condition, orderBy: { displayOrder: 'asc' } });
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'FAQS query failed', details: err.message });
  }
});

router.post('/faqs', adminGuard, async (req: Request, res: Response) => {
  try {
    const { question, answer, category, displayOrder } = req.body;
    const created = await prisma.faq.create({
      data: { question, answer, category, displayOrder: displayOrder || 1 }
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'FAQ creation failed' });
  }
});

router.delete('/faqs/:id', adminGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.faq.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'FAQ removed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Deletion failed' });
  }
});

`;

// insert before 11. CENTRALIZED API
code = code.replace(/\/\/ -------------------------------------------------------------\n\/\/ 11\. CENTRALIZED API/, faqsCode + "// -------------------------------------------------------------\n// 11. CENTRALIZED API");

fs.writeFileSync('server/src/routes/admin.ts', code);
console.log('Restored faqs');
