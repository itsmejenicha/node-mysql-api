import nodemailer from 'nodemailer';
import config from '../config.json';

export default async function sendEmail({ to, subject, html, from = config.emailFrom }: any) {
<<<<<<< HEAD

    const transporter = nodemailer.createTransport({
        host: config.smtpOptions.host,
        port: config.smtpOptions.port,
        secure: false, // important
        auth: config.smtpOptions.auth,
        tls: {
            rejectUnauthorized: false // 🔥 THIS FIXES YOUR ERROR
        }
    });

    await transporter.sendMail({
        from,
        to,
        subject,
        html
    });
=======
    const transporter = nodemailer.createTransport(config.smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
>>>>>>> 947910d42458cc1862d6f2c4987c1acda50115fd
}