const express = require('express');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

function createTransporter(company) {
  var port = Number(company.smtpPort) || 587;
  var secure = company.smtpSecure === true || port === 465;
  
  return nodemailer.createTransport({
    host: company.smtpHost,
    port: port,
    secure: secure,
    auth: { user: company.smtpUser, pass: company.smtpPass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// POST /api/email/send
router.post('/send', authenticate, async (req, res) => {
  try {
    var { type, docId, to, cc, subject, body } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject required' });

    var company = await prisma.company.findUnique({ where: { id: req.companyId } });
    if (!company || !company.smtpHost || !company.smtpUser) {
      return res.status(400).json({ error: 'SMTP not configured. Go to Company Setup > Email & Notifications.' });
    }

    var transporter = createTransporter(company);

    await transporter.sendMail({
      from: '"' + (company.emailFromName || company.name) + '" <' + company.smtpUser + '>',
      to: to,
      cc: cc || undefined,
      replyTo: company.emailReplyTo || company.smtpUser,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });

    try {
      await prisma.emailLog.create({
        data: { companyId: req.companyId, type: type || 'general', docId: docId || null, toEmail: to, ccEmail: cc || null, subject: subject, body: body, status: 'sent', sentBy: req.user.id }
      });
    } catch (logErr) { console.error('Email log error:', logErr.message); }

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Email send error:', err.message);

    try {
      await prisma.emailLog.create({
        data: { companyId: req.companyId, type: req.body.type || 'general', docId: req.body.docId || null, toEmail: req.body.to || '', subject: req.body.subject || '', body: req.body.body || '', status: 'failed', sentBy: req.user.id }
      });
    } catch (logErr) { /* ignore */ }

    res.status(500).json({ error: 'Failed to send: ' + err.message });
  }
});

// POST /api/email/test
router.post('/test', authenticate, async (req, res) => {
  try {
    var company = await prisma.company.findUnique({ where: { id: req.companyId } });
    if (!company || !company.smtpHost || !company.smtpUser || !company.smtpPass) {
      return res.status(400).json({ error: 'SMTP not fully configured. Fill in Host, Port, Username, and Password.' });
    }

    console.log('SMTP TEST: host=' + company.smtpHost + ' port=' + company.smtpPort + ' user=' + company.smtpUser + ' secure=' + company.smtpSecure);

    var transporter = createTransporter(company);

    await transporter.verify();
    console.log('SMTP connection verified');

    await transporter.sendMail({
      from: '"' + (company.emailFromName || company.name) + '" <' + company.smtpUser + '>',
      to: company.smtpUser,
      subject: 'ContractorOS - Test Email',
      text: 'This is a test email from ContractorOS.\n\nIf you received this, your SMTP settings are configured correctly.\n\nSent: ' + new Date().toLocaleString() + '\n\n' + (company.emailSignature || ''),
    });

    res.json({ message: 'Test email sent to ' + company.smtpUser });
  } catch (err) {
    console.error('SMTP test error:', err.message);
    
    var hint = '';
    if (err.message.includes('ECONNREFUSED')) hint = ' Check that your SMTP host and port are correct.';
    else if (err.message.includes('ENOTFOUND')) hint = ' SMTP host not found. Check the hostname.';
    else if (err.message.includes('auth') || err.message.includes('535') || err.message.includes('Authentication')) hint = ' Check your username and password. For Gmail, use an App Password.';
    else if (err.message.includes('SSL') || err.message.includes('TLS') || err.message.includes('wrong version')) hint = ' SSL/TLS mismatch. Try toggling Secure SSL, or check port (465=SSL, 587=TLS).';
    else if (err.message.includes('ETIMEDOUT')) hint = ' Connection timed out. Check host and port.';
    
    res.status(500).json({ error: 'SMTP test failed: ' + err.message + hint });
  }
});

// GET /api/email/log
router.get('/log', authenticate, async (req, res) => {
  try {
    var logs = await prisma.emailLog.findMany({
      where: { companyId: req.companyId },
      orderBy: { sentAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
