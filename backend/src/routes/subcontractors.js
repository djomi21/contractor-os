const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

// GET /api/subcontractors
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.subcontractor.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subcontractors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.subcontractor.findFirst({ where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id), companyId: req.companyId } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subcontractors
router.post('/', authenticate, async (req, res) => {
  try {
    const item = await prisma.subcontractor.create({ data: { ...req.body, companyId: req.companyId } });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/subcontractors/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.subcontractor.update({
      where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id) },
      data: req.body,
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/subcontractors/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.subcontractor.delete({ where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
