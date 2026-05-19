import nodemailer from 'nodemailer';

// Load config file only in development
const loadFileConfig = () => {
    try {
        return require('../config.json');
    } catch {
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

// Try Resend first (preferred for production), fallback to SMTP
async function sendWithResend({ to, subject, html, from }: any) {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    
    const resend = new (require('resend').Resend)(process.env.RESEND_API_KEY);
    
    return await resend.emails.send({
        from: from || getEmailFrom(),
        to,
        subject,
        html
    });
}

async function sendWithSMTP({ to, subject, html, from }: any) {
    let smtpOptions;
    
    if (process.env.SMTP_HOST) {
        smtpOptions = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            } : undefined
        };
    } else if (fileConfig.smtpOptions) {
        smtpOptions = fileConfig.smtpOptions;
    } else {
        throw new Error('No email configuration found (Resend or SMTP)');
    }
    
    const transporter = nodemailer.createTransport(smtpOptions);
    
    await transporter.sendMail({
        from: from || getEmailFrom(),
        to,
        subject,
        html
    });
}

export default async function sendEmail({ to, subject, html, from }: any) {
    // Try Resend first (preferred for production)
    if (process.env.RESEND_API_KEY) {
        const result = await sendWithResend({ to, subject, html, from });
        if (result && !result.error) {
            return result;
        }
    }
    
    // Fallback to SMTP
    await sendWithSMTP({ to, subject, html, from });
}