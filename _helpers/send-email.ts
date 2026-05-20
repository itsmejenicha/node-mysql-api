// _helpers/send-email.ts

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