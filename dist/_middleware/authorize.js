"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authorize;
const express_jwt_1 = require("express-jwt");
const db_1 = __importDefault(require("../_helpers/db"));
// Helper function to load config file (only in non-production)
const loadFileConfig = () => {
    try {
        return require('../config.json');
    }
    catch (_a) {
        return {};
    }
};
const fileConfig = process.env.NODE_ENV === 'production' ? {} : loadFileConfig();
const secret = process.env.JWT_SECRET || fileConfig.secret;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
}
function authorize(roles = []) {
    // make sure roles is always an array
    if (typeof roles === 'string') {
        roles = [roles];
    }
    return [
        (0, express_jwt_1.expressjwt)({ secret, algorithms: ['HS256'] }),
        async (req, res, next) => {
            try {
                const account = await db_1.default.Account.findByPk(req.auth.sub);
                if (!account || (roles.length && !roles.includes(account.role))) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                const refreshTokens = await account.getRefreshTokens();
                req.user = {
                    id: account.id,
                    role: account.role,
                    ownsToken: (token) => !!refreshTokens.find((x) => x.token === token)
                };
                next();
            }
            catch (err) {
                next(err);
            }
        }
    ];
}
