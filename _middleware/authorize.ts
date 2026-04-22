import { expressjwt } from 'express-jwt';
import config from '../config.json';
import db from '../_helpers/db';

const { secret } = config;

export default function authorize(roles: any = []) {
    // make sure roles is always an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        expressjwt({ secret, algorithms: ['HS256'] }),

        async (req: any, res: any, next: any) => {
            try {
                const account = await db.Account.findByPk(req.auth.sub);

                if (!account || (roles.length && !roles.includes(account.role))) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                const refreshTokens = await account.getRefreshTokens();

                req.user = {
                    id: account.id,
                    role: account.role,
                    ownsToken: (token: any) =>
                        !!refreshTokens.find((x: any) => x.token === token)
                };

                next();
            } catch (err) {
                next(err);
            }
        }
    ];
}