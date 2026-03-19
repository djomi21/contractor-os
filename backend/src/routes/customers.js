const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

// GET /api/customers
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.customer.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.customer.findFirst({ where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id), companyId: req.companyId } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers
router.post('/', authenticate, async (req, res) => {
  try {
    const item = await prisma.customer.create({ data: { ...req.body, companyId: req.companyId } });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/customers/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.customer.update({
      where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id) },
      data: req.body,
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: isNaN(req.params.id) ? req.params.id : Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
