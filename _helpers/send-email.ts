// _helpers/send-email.ts

// Load config file only in development
const loadFileConfig = () => {
    try {
        return require('../config.json');
    } catch {
        return {};import nodemailer from 'nodemailer';

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

function getSmtpOptions() {
    // Check environment variables first (for production)
    if (process.env.SMTP_HOST) {
        const options: any = {
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

export default async function sendEmail({ to, subject, html, from }: any) {
    console.log('📧 Sending email to:', to);
    console.log('📧 Subject:', subject);
    
    const smtpOptions = getSmtpOptions();
    const emailFrom = from || getEmailFrom();
    
    console.log('📧 SMTP Host:', smtpOptions.host);
    console.log('📧 SMTP Port:', smtpOptions.port);
    console.log('📧 From:', emailFrom);
    
    const transporter = nodemailer.createTransport(smtpOptions);
    
    try {
        const info = await transporter.sendMail({
            from: emailFrom,
            to,
            subject,
            html
        });
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
    }
}
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

export default async function sendEmail({ to, subject, html, from }: any) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = from || getEmailFrom();
    
    if (!apiKey) {
        console.error('❌ BREVO_API_KEY is missing!');
        throw new Error('BREVO_API_KEY environment variable is not set');
    }
    
    console.log('📧 Sending email via Brevo API to:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 From:', senderEmail);
    
    const requestBody = {
        sender: { email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
    };
    
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Brevo API error:', result);
            throw new Error(`Brevo API error: ${result.message || JSON.stringify(result)}`);
        }
        
        console.log('✅ Email sent successfully via Brevo API');
        console.log('📧 Message ID:', result.messageId);
        return result;
        
    } catch (error: any) {
        console.error('❌ Email sending failed:', error.message);
        throw error;
    }
}
