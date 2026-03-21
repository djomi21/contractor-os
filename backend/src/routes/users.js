const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

// Fields allowed for user create/update
var USER_FIELDS = ['name', 'email', 'phone', 'role', 'status', 'avatar', 'lastLogin'];

function pickFields(body, fields) {
  var clean = {};
  fields.forEach(function(k) {
    if (body[k] !== undefined) clean[k] = body[k];
  });
  return clean;
}

// GET /api/users
router.get('/', authenticate, async (req, res) => {
  try {
    var items = await prisma.user.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, companyId: true, name: true, email: true, phone: true, role: true, status: true, avatar: true, lastLogin: true, createdAt: true, updatedAt: true }
    });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    var item = await prisma.user.findFirst({
      where: { id: Number(req.params.id), companyId: req.companyId },
      select: { id: true, companyId: true, name: true, email: true, phone: true, role: true, status: true, avatar: true, lastLogin: true, createdAt: true, updatedAt: true }
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — create new user with default password
router.post('/', authenticate, async (req, res) => {
  try {
    var data = pickFields(req.body, USER_FIELDS);

    if (!data.name || !data.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email already exists
    var existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    // Generate default password: "Welcome123!" — user should change on first login
    var defaultPassword = req.body.password || 'Welcome123!';
    var passwordHash = await bcrypt.hash(defaultPassword, 12);

    var item = await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        passwordHash: passwordHash,
        mustChangePassword: true,
        companyId: req.companyId
      }
    });

    // Don't send passwordHash back
    var safe = { ...item };
    delete safe.passwordHash;
    console.log('User created:', safe.email, 'with default password');
    res.status(201).json(safe);
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    var data = pickFields(req.body, USER_FIELDS);
    if (data.email) data.email = data.email.toLowerCase();

    var item = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: data
    });

    var safe = { ...item };
    delete safe.passwordHash;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
