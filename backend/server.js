require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const EXCEL_PATH = path.join(DATA_DIR, 'FinalEVscrapsheet.xlsx');
const HISTORY_PATH = path.join(DATA_DIR, 'upload_history.json');
const APPOINTMENTS_PATH = path.join(DATA_DIR, 'appointments.json');
const CMS_PATH = path.join(DATA_DIR, 'cms.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const copyIfMissing = (filename, destinationDir = DATA_DIR) => {
  const src = path.join(ROOT_DIR, filename);
  const dest = path.join(destinationDir, filename);
  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
};

if (!fs.existsSync(APPOINTMENTS_PATH)) {
  const defaultAppointments = [];
  fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(defaultAppointments, null, 2), 'utf-8');
}
if (!fs.existsSync(HISTORY_PATH)) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(CMS_PATH)) {
  fs.writeFileSync(CMS_PATH, JSON.stringify({ title: '', subtitle: '' }, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const parsed = path.parse(file.originalname);
    const uniqueName = parsed.name + '-' + Date.now() + parsed.ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

function logHistory(action, filename, uploader = 'Admin') {
  let history = [];
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')); } catch (e) { history = []; }
  }
  history.push({ timestamp: new Date().toISOString(), action, filename, uploader });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
}

app.use(express.static(FRONTEND_DIR));
app.use('/admin', express.static(ADMIN_DIR));
app.use('/admin/css', express.static(path.join(ADMIN_DIR, 'css')));
app.use('/admin/js', express.static(path.join(ADMIN_DIR, 'js')));

app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'admin.html')));

app.get('/api/files', (req, res) => {
  try {
    let files = fs.readdirSync(UPLOADS_DIR);
    files = files.filter(f => f.endsWith('.xlsx'));
    if (fs.existsSync(EXCEL_PATH)) files.unshift('FinalEVscrapsheet.xlsx');
    files = [...new Set(files)];
    res.setHeader('Cache-Control', 'no-store');
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Could not list files.' });
  }
});

app.get('/api/file/:filename', (req, res) => {
  const filename = req.params.filename;
  let filePath = path.join(UPLOADS_DIR, filename);
  if (filename === 'FinalEVscrapsheet.xlsx') filePath = EXCEL_PATH;
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(filePath);
  } else {
    res.status(404).send('Spreadsheet database file not found on server.');
  }
});

app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    logHistory('Excel Upload', req.file.filename);
    res.json({ success: true, message: 'Spreadsheet uploaded and synchronized successfully!', filename: req.file.filename });
  } catch (err) {
    console.error('Upload API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const buffer = req.body;
    const filename = req.query.file || 'FinalEVscrapsheet.xlsx';
    if (!buffer || buffer.length === 0) return res.status(400).json({ error: 'Empty buffer data received.' });

    let targetPath = path.join(UPLOADS_DIR, filename);
    if (filename === 'FinalEVscrapsheet.xlsx') targetPath = EXCEL_PATH;

    fs.writeFileSync(targetPath, buffer);
    logHistory('Grid Modifications Saved', filename);
    res.json({ success: true, message: 'Changes written back to server spreadsheet successfully!' });
  } catch (err) {
    console.error('Save API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  let history = [];
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')); } catch (e) {}
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(history);
});

app.get('/api/cms', (req, res) => {
  let cms = {};
  if (fs.existsSync(CMS_PATH)) {
    try { cms = JSON.parse(fs.readFileSync(CMS_PATH, 'utf-8')); } catch (e) {}
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(cms);
});

app.post('/api/cms', (req, res) => {
  try {
    const { title, subtitle } = req.body;
    const cms = { title, subtitle };
    fs.writeFileSync(CMS_PATH, JSON.stringify(cms, null, 2), 'utf-8');
    res.json({ success: true, message: 'Homepage CMS data saved on server!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments', (req, res) => {
  let appointments = [];
  if (fs.existsSync(APPOINTMENTS_PATH)) {
    try { appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8')); } catch (e) {}
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(appointments);
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'dineshachalkar99@gmail.com',
    pass: process.env.SMTP_PASS || 'euimllcheabttpwr'
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { name, email, phone, company, date, time } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Client Name and Email are required.' });

    let appointments = [];
    if (fs.existsSync(APPOINTMENTS_PATH)) {
      try { appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8')); } catch (e) {}
    }

    const newAppt = {
      id: 'APT-' + Date.now(),
      name,
      email,
      phone: phone || 'N/A',
      company: company || 'N/A',
      date: date || 'TBD',
      time: time || 'TBD',
      timestamp: new Date().toISOString(),
      status: 'Confirmed'
    };
    appointments.push(newAppt);
    fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');

    const mailOptions = {
      from: `"ChargeWave Media" <${process.env.SMTP_USER || 'hello@chargewavemedia.co'}>`,
      to: email,
      subject: 'Appointment Confirmed - ChargeWave Media Lead Setup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #54D52B; margin: 0;">ChargeWave Media</h2>
            <p style="color: #718096; margin: 5px 0 0;">Prequalified EV Installer Leads</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-top: 0;">Hello ${name},</h3>
          <p style="line-height: 1.6;">Thank you for scheduling your strategy session with ChargeWave Media. Your appointment is confirmed!</p>
          <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #4a5568;">Appointment Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
              <tr><td style="padding: 4px 0; color: #718096; width: 120px;">Company:</td><td style="padding: 4px 0; font-weight: bold;">${company || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0; color: #718096;">Date:</td><td style="padding: 4px 0; font-weight: bold; color: #0A96FF;">${date || 'TBD'}</td></tr>
              <tr><td style="padding: 4px 0; color: #718096;">Time:</td><td style="padding: 4px 0; font-weight: bold; color: #0A96FF;">${time || 'TBD'} EST</td></tr>
              <tr><td style="padding: 4px 0; color: #718096;">Phone:</td><td style="padding: 4px 0;">${phone || 'N/A'}</td></tr>
            </table>
          </div>
          <p style="line-height: 1.6;"><strong>Next Steps:</strong> Akash Patale will review your company profile and prepare a custom EV installer territory lead plan.</p>
          <p style="line-height: 1.6;">If you need to reschedule or have any questions, simply reply directly to this email.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0 15px;">
          <div style="text-align: center; color: #a0aec0; font-size: 0.8rem;">
            <p style="margin: 0;">&copy; 2026 ChargeWave Media. All rights reserved.</p>
            <p style="margin: 5px 0 0;">CWM Admin Suite</p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error('[MAIL ERROR]', mailErr.message);
    }

    res.json({ success: true, message: 'Appointment booked successfully and client notified!', appointment: newAppt });
  } catch (err) {
    console.error('Appointments API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Please provide an array of appointment IDs to delete.' });

    let appointments = [];
    if (fs.existsSync(APPOINTMENTS_PATH)) appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));

    const initialCount = appointments.length;
    appointments = appointments.filter(a => !ids.includes(a.id));
    if (appointments.length === initialCount) return res.status(404).json({ error: 'No matching appointments found.' });

    fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');
    res.json({ success: true, message: 'Selected appointments deleted successfully.' });
  } catch (err) {
    console.error('Delete Appointments API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments/approve/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let appointments = [];
    if (fs.existsSync(APPOINTMENTS_PATH)) appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));

    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Appointment not found' });

    appointments[index].status = 'Approved';
    fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');

    const client = appointments[index];
    const mailOptions = {
      from: `"ChargeWave Media" <${process.env.SMTP_USER || 'hello@chargewavemedia.co'}>`,
      to: client.email,
      subject: 'Campaign Approved - ChargeWave Media',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #54D52B; margin: 0;">ChargeWave Media</h2>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-top: 0;">Hello ${client.name},</h3>
          <p style="line-height: 1.6;">Great news! Your account and campaign setup have been formally <strong>Approved</strong> by our team.</p>
          <p style="line-height: 1.6;">We are currently initializing your custom pre-qualified EV installer funnel. You will be receiving your dashboard access details shortly.</p>
          <p style="line-height: 1.6;">We look forward to speaking with you on <strong>${client.date}</strong> at <strong>${client.time}</strong>.</p>
          <br>
          <p>Best regards,</p>
          <p><strong>ChargeWave Media Team</strong></p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error('[MAIL ERROR]', mailErr.message);
    }

    res.json({ success: true, message: 'Client approved and notified successfully!' });
  } catch (err) {
    console.error('Approve API error:', err);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`ChargeWave Media Server active on http://127.0.0.1:${PORT}`));
}

module.exports = app;
