require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Paths (Use /tmp on Vercel serverless environment)
const IS_VERCEL = process.env.VERCEL === '1';
const BASE_DIR = IS_VERCEL ? '/tmp' : __dirname;

const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const EXCEL_PATH = path.join(BASE_DIR, 'FinalEVscrapsheet.xlsx');
const HISTORY_PATH = path.join(BASE_DIR, 'upload_history.json');
const APPOINTMENTS_PATH = path.join(BASE_DIR, 'appointments.json');
const CMS_PATH = path.join(BASE_DIR, 'cms.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Copy default files to /tmp on Vercel if they don't exist
if (IS_VERCEL) {
    const copyIfMissing = (filename) => {
        const dest = path.join(BASE_DIR, filename);
        const src = path.join(__dirname, filename);
        if (!fs.existsSync(dest) && fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
        }
    };
    copyIfMissing('cms.json');
    copyIfMissing('appointments.json');
    copyIfMissing('upload_history.json');
    // Also copy files in uploads directory
    const srcUploads = path.join(__dirname, 'uploads');
    if (fs.existsSync(srcUploads)) {
        fs.readdirSync(srcUploads).forEach(file => {
            copyIfMissing(path.join('uploads', file));
        });
    }
}

// Configure Multer for Excel file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Retain original filename, append timestamp to avoid overwriting unique files
        const parsed = path.parse(file.originalname);
        const uniqueName = parsed.name + '-' + Date.now() + parsed.ext;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });

// Helper to log history
function logHistory(action, filename, uploader = 'Admin') {
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
        try {
            history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        } catch (e) {
            history = [];
        }
    }
    history.push({
        timestamp: new Date().toISOString(),
        action: action,
        filename: filename,
        uploader: uploader
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
}

// 1. Static Files serving
app.use(express.static(__dirname));

// 2. GET List of available Excel Files in uploads/
app.get('/api/files', (req, res) => {
    try {
        let files = fs.readdirSync(UPLOADS_DIR);
        files = files.filter(f => f.endsWith('.xlsx'));
        
        // Include the fallback root file if it exists
        if (fs.existsSync(EXCEL_PATH)) {
            files.unshift('FinalEVscrapsheet.xlsx');
        }
        // Remove duplicates
        files = [...new Set(files)];
        
        res.setHeader('Cache-Control', 'no-store');
        res.json({ files });
    } catch(err) {
        res.status(500).json({ error: 'Could not list files.' });
    }
});

// 3. GET Specific Excel File
app.get('/api/file/:filename', (req, res) => {
    const filename = req.params.filename;
    let filePath = path.join(UPLOADS_DIR, filename);
    
    if (filename === 'FinalEVscrapsheet.xlsx') {
        filePath = EXCEL_PATH;
    }
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Spreadsheet database file not found on server.');
    }
});

// 4. POST Excel File Upload
app.post('/api/upload', upload.single('excelFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        logHistory('Excel Upload', req.file.filename);
        res.json({ success: true, message: 'Spreadsheet uploaded and synchronized successfully!', filename: req.file.filename });
    } catch (err) {
        console.error('Upload API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. POST Excel Data Save (modifications from grid)
app.post('/api/save', (req, res) => {
    try {
        const buffer = req.body;
        const filename = req.query.file || 'FinalEVscrapsheet.xlsx';
        
        if (!buffer || buffer.length === 0) {
            return res.status(400).json({ error: 'Empty buffer data received.' });
        }
        
        let targetPath = path.join(UPLOADS_DIR, filename);
        if (filename === 'FinalEVscrapsheet.xlsx') {
            targetPath = EXCEL_PATH;
        }
        
        fs.writeFileSync(targetPath, buffer);
        logHistory('Grid Modifications Saved', filename);
        res.json({ success: true, message: 'Changes written back to server spreadsheet successfully!' });
    } catch (err) {
        console.error('Save API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. GET Upload History Log
app.get('/api/history', (req, res) => {
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
        try {
            history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        } catch (e) {}
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(history);
});

// 7. GET CMS Content
app.get('/api/cms', (req, res) => {
    let cms = {};
    if (fs.existsSync(CMS_PATH)) {
        try {
            cms = JSON.parse(fs.readFileSync(CMS_PATH, 'utf-8'));
        } catch (e) {}
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(cms);
});

// 8. POST CMS Content
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

// 9. GET Bookings List
app.get('/api/appointments', (req, res) => {
    let appointments = [];
    if (fs.existsSync(APPOINTMENTS_PATH)) {
        try {
            appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
        } catch (e) {}
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(appointments);
});

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'dineshachalkar99@gmail.com',
        pass: process.env.SMTP_PASS || 'euimllcheabttpwr'
    }
});

// 10. POST Client Booking scheduling & auto mailer
app.post('/api/appointments', async (req, res) => {
    try {
        const { name, email, phone, company, date, time } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Client Name and Email are required.' });
        }
        
        // Save appointment to DB
        let appointments = [];
        if (fs.existsSync(APPOINTMENTS_PATH)) {
            try {
                appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
            } catch (e) {}
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
        
        // Nodemailer: Trigger Confirmation Mail
        console.log(`\n==================================================`);
        console.log(`[BOOKING RECEIVED] Sending Confirmation Mail to: ${email}`);
        
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
                    
                    <p style="line-height: 1.6;"><strong>Next Steps:</strong> Akash Patale (Lead Campaign Manager) will review your company profile and prepare a custom EV installer territory lead list for your review on the call.</p>
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
            console.log(`[MAIL SUCCESS] Confirmation email successfully dispatched to ${email}!`);
        } catch (mailErr) {
            console.error(`[MAIL ERROR] Failed to send email to ${email}:`, mailErr.message);
        }
        
        console.log(`==================================================\n`);
        
        res.json({ success: true, message: 'Appointment booked successfully and client notified!', appointment: newAppt });
    } catch (err) {
        console.error('Appointments API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 10.5 DELETE Multiple Client Appointments
app.delete('/api/appointments', (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Please provide an array of appointment IDs to delete.' });
        }
        
        let appointments = [];
        if (fs.existsSync(APPOINTMENTS_PATH)) {
            appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
        }
        
        const initialCount = appointments.length;
        appointments = appointments.filter(a => !ids.includes(a.id));
        
        if (appointments.length === initialCount) {
            return res.status(404).json({ error: 'No matching appointments found.' });
        }
        
        fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');
        res.json({ success: true, message: 'Selected appointments deleted successfully.' });
    } catch (err) {
        console.error('Delete Appointments API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 11. POST Approve Client Appointment
app.post('/api/appointments/approve/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let appointments = [];
        if (fs.existsSync(APPOINTMENTS_PATH)) {
            appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
        }
        
        const index = appointments.findIndex(a => a.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        appointments[index].status = 'Approved';
        fs.writeFileSync(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');
        
        const client = appointments[index];
        
        console.log(`\n==================================================`);
        console.log(`[APPROVAL SENT] Sending Approval Mail to: ${client.email}`);
        
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
            console.log(`[MAIL SUCCESS] Approval email successfully dispatched to ${client.email}!`);
        } catch (mailErr) {
            console.error(`[MAIL ERROR] Failed to send approval email to ${client.email}:`, mailErr.message);
        }
        
        console.log(`==================================================\n`);
        
        res.json({ success: true, message: 'Client approved and notified successfully!' });
    } catch(err) {
        console.error('Approve API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start Server (Only listen locally, export for Vercel)
if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n==================================================`);
        console.log(`  ChargeWave Media Server active on http://127.0.0.1:${PORT}`);
        console.log(`  Disable Cache: TRUE`);
        console.log(`==================================================\n`);
    });
}

module.exports = app;
