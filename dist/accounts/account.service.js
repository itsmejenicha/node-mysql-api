"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const send_email_1 = __importDefault(require("../_helpers/send-email"));
const db_1 = __importDefault(require("../_helpers/db"));
const role_1 = __importDefault(require("../_helpers/role"));
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
function getJwtSecret() {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required in production');
    }
    const secret = process.env.JWT_SECRET || fileConfig.secret;
    if (!secret)
        throw new Error('JWT secret is missing');
    return secret;
}
exports.default = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};
// ---------------- AUTH ----------------
async function authenticate({ email, password, ipAddress }) {
    const account = await db_1.default.Account.scope('withHash').findOne({ where: { email } });
    if (!account || !account.isVerified || !(await bcryptjs_1.default.compare(password, account.passwordHash))) {
        throw 'Email or password is incorrect';
    }
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);
    await refreshToken.save();
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}
async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();
    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();
    const jwtToken = generateJwtToken(account);
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}
async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}
// ---------------- REGISTER ----------------
async function register(params, origin) {
    console.log('🔵 1. Register function started for:', params.email);
    try {
        // Check if email exists
        console.log('🔵 2. Checking if email exists...');
        const existingAccount = await db_1.default.Account.findOne({ where: { email: params.email } });
        if (existingAccount) {
            console.log('🔵 3. Email already exists, sending notification');
            return await sendAlreadyRegisteredEmail(params.email, origin);
        }
        console.log('🔵 4. Building new account...');
        const account = db_1.default.Account.build(params);
        const isFirstAccount = (await db_1.default.Account.count()) === 0;
        account.role = isFirstAccount ? role_1.default.Admin : role_1.default.User;
        account.verificationToken = randomTokenString();
        console.log('🔵 5. Hashing password...');
        account.passwordHash = await hash(params.password);
        console.log('🔵 6. Saving account to database...');
        await account.save();
        console.log('✅ Account saved! ID:', account.id);
        console.log('🔵 7. Sending verification email...');
        await sendVerificationEmail(account, origin);
        console.log('✅ Verification email sent');
        return { success: true };
    }
    catch (err) {
        console.error('❌ REGISTRATION ERROR:', err);
        throw err;
    }
}
async function verifyEmail({ token }) {
    const account = await db_1.default.Account.findOne({ where: { verificationToken: token } });
    if (!account)
        throw 'Verification failed';
    account.verified = new Date();
    account.verificationToken = null;
    await account.save();
}
// ---------------- PASSWORD RESET ----------------
async function forgotPassword({ email }, origin) {
    const account = await db_1.default.Account.findOne({ where: { email } });
    if (!account)
        return;
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();
    await sendPasswordResetEmail(account, origin);
}
async function validateResetToken({ token }) {
    const account = await db_1.default.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [sequelize_1.Op.gt]: new Date() }
        }
    });
    if (!account)
        throw 'Invalid token';
    return account;
}
async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });
    account.passwordHash = await hash(password);
    account.passwordReset = new Date();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();
}
// ---------------- CRUD ----------------
async function getAll() {
    const accounts = await db_1.default.Account.findAll();
    return accounts.map((x) => basicDetails(x));
}
async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}
async function create(params) {
    if (await db_1.default.Account.findOne({ where: { email: params.email } })) {
        throw `Email "${params.email}" is already registered`;
    }
    const account = db_1.default.Account.build(params);
    account.verified = new Date();
    account.passwordHash = await hash(params.password);
    await account.save();
    return basicDetails(account);
}
async function update(id, params) {
    const account = await getAccount(id);
    if (params.email &&
        account.email !== params.email &&
        await db_1.default.Account.findOne({ where: { email: params.email } })) {
        throw `Email "${params.email}" is already taken`;
    }
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }
    Object.assign(account, params);
    account.updated = new Date();
    await account.save();
    return basicDetails(account);
}
async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}
// ---------------- HELPERS ----------------
async function getAccount(id) {
    const account = await db_1.default.Account.findByPk(id);
    if (!account)
        throw 'Account not found';
    return account;
}
async function getRefreshToken(token) {
    const refreshToken = await db_1.default.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) {
        throw 'Invalid token';
    }
    return refreshToken;
}
async function hash(password) {
    return await bcryptjs_1.default.hash(password, 10);
}
function generateJwtToken(account) {
    return jsonwebtoken_1.default.sign({ sub: account.id, id: account.id }, getJwtSecret(), { expiresIn: '15m' });
}
function generateRefreshToken(account, ipAddress) {
    return db_1.default.RefreshToken.build({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: ipAddress
    });
}
function randomTokenString() {
    return crypto_1.default.randomBytes(40).toString('hex');
}
function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}
// ---------------- EMAIL ----------------
async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        message = `<p>Please click the link below to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    }
    else {
        message = `<p>Please use the token below to verify your email:</p>
                   <p><code>${account.verificationToken}</code></p>`;
    }
    await (0, send_email_1.default)({
        to: account.email,
        subject: 'Verify Email',
        html: `<h4>Verify Email</h4><p>Thanks for registering!</p>${message}`
    });
}
async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you forgot your password, visit:
                   <a href="${origin}/account/forgot-password">Forgot Password</a></p>`;
    }
    else {
        message = `<p>Use the /account/forgot-password endpoint to reset your password.</p>`;
    }
    await (0, send_email_1.default)({
        to: email,
        subject: 'Email Already Registered',
        html: `<h4>Email Already Registered</h4><p>${email} is already registered.</p>${message}`
    });
}
async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Click the link below to reset your password (valid for 1 day):</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    }
    else {
        message = `<p>Use this token to reset your password:</p>
                   <p><code>${account.resetToken}</code></p>`;
    }
    await (0, send_email_1.default)({
        to: account.email,
        subject: 'Reset Password',
        html: `<h4>Reset Password</h4>${message}`
    });
}
