"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Load config file only in development
const loadFileConfig = () => {
    try {
        return require('../config.json');
    }
    catch (_a) {
        return {};
    }
};
const fileConfig = process.env.NODE_ENV === 'production' ? {} : loadFileConfig();
function getEmailFrom() {
    if (process.env.EMAIL_FROM) {
        return process.env.EMAIL_FROM;
    }
    if (fileConfig.emailFrom) {
        return fileConfig.emailFrom;
    }
    return 'no-reply@example.com';
}
function getSmtpOptions() {
    // Check environment variables first (for production)
    if (process.env.SMTP_HOST) {
        const options = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            } : undefined
        };
        // Add TLS to ignore self-signed certificate errors (development only)
        if (process.env.NODE_ENV !== 'production') {
            options.tls = { rejectUnauthorized: false };
        }
        return options;
    }
    // Fall back to config.json (for development)
    if (fileConfig.smtpOptions) {
        const options = { ...fileConfig.smtpOptions };
        // Add TLS to ignore self-signed certificate errors (development only)
        if (process.env.NODE_ENV !== 'production' && !options.tls) {
            options.tls = { rejectUnauthorized: false };
        }
        return options;
    }
    throw new Error('No SMTP configuration found');
}
async function sendEmail({ to, subject, html, from }) {
    console.log('📧 Sending email to:', to);
    console.log('📧 Subject:', subject);
    const smtpOptions = getSmtpOptions();
    const emailFrom = from || getEmailFrom();
    console.log('📧 SMTP Host:', smtpOptions.host);
    console.log('📧 SMTP Port:', smtpOptions.port);
    console.log('📧 From:', emailFrom);
    const transporter = nodemailer_1.default.createTransport(smtpOptions);
    try {
        const info = await transporter.sendMail({
            from: emailFrom,
            to,
            subject,
            html
        });
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    }
    catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
    }
}
