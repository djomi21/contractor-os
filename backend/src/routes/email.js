const express = require('express');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

// POST /api/email/send
router.post('/send', authenticate, async (req, res) => {
  try {
    const { type, docId, to, cc, subject, body } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject required' });

    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    if (!company?.smtpHost || !company?.smtpUser) {
      return res.status(400).json({ error: 'SMTP not configured. Go to Company Setup → Email & Notifications.' });
    }

    const transporter = nodemailer.createTransport({
      host: company.smtpHost,
      port: company.smtpPort || 587,
      secure: company.smtpPort === 465,
      auth: { user: company.smtpUser, pass: company.smtpPass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: `"${company.emailFromName || company.name}" <${company.smtpUser}>`,
      to,
      cc: cc || undefined,
      replyTo: company.emailReplyTo || company.smtpUser,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    };

    await transporter.sendMail(mailOptions);

    // Log the email
    await prisma.emailLog.create({
      data: { companyId: req.companyId, type: type || 'general', docId, toEmail: to, ccEmail: cc, subject, body, status: 'sent', sentBy: req.user.id }
    });

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Email send error:', err);

    // Log the failure
    try {
      await prisma.emailLog.create({
        data: { companyId: req.companyId, type: req.body.type || 'general', docId: req.body.docId, toEmail: req.body.to, subject: req.body.subject || '', body: req.body.body || '', status: 'failed', sentBy: req.user.id }
      });
    } catch (logErr) { /* ignore log errors */ }

    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// POST /api/email/test
router.post('/test', authenticate, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    if (!company?.smtpHost || !company?.smtpUser) {
      return res.status(400).json({ error: 'SMTP not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: company.smtpHost,
      port: company.smtpPort || 587,
      secure: company.smtpPort === 465,
      auth: { user: company.smtpUser, pass: company.smtpPass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${company.emailFromName || company.name}" <${company.smtpUser}>`,
      to: company.smtpUser,
      subject: 'ContractorOS — Test Email',
      text: `This is a test email from ContractorOS.\n\nIf you received this, your SMTP settings are configured correctly.\n\n${company.emailSignature || ''}`,
    });

    res.json({ message: 'Test email sent to ' + company.smtpUser });
  } catch (err) {
    res.status(500).json({ error: 'SMTP test failed: ' + err.message });
  }
});

// GET /api/email/log
router.get('/log', authenticate, async (req, res) => {
  const logs = await prisma.emailLog.findMany({
    where: { companyId: req.companyId },
    orderBy: { sentAt: 'desc' },
    take: 50
  });
  res.json(logs);
});

module.exports = router;
