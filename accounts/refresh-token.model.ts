import { DataTypes } from 'sequelize';

export default function model(sequelize: any) {

    const attributes = {
        token: { type: DataTypes.STRING },
        expires: { type: DataTypes.DATE },
        created: { type: DataTypes.DATE },
        createdByIp: { type: DataTypes.STRING },
        revoked: { type: DataTypes.DATE },
        revokedByIp: { type: DataTypes.STRING },
        replacedByToken: { type: DataTypes.STRING },

        isExpired: {
            type: DataTypes.VIRTUAL,
            get(this: any) {
                return Date.now() >= new Date(this.expires).getTime();
            }
        },

        isActive: {
            type: DataTypes.VIRTUAL,
            get(this: any) {
                return !this.revoked && !this.isExpired;
            }
        }
    };

    const options = { timestamps: false };

    return sequelize.define('refreshToken', attributes, options);
}