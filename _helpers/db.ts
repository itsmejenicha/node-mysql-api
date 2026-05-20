import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

// Load config file only in development
const loadFileConfig = () => {
    try {
        return require('../config.json');
    } catch {
        return {};
    }
};

// IMPORTANT FIX: correct structure access
const fileConfig = process.env.NODE_ENV === 'production'
    ? {}
    : loadFileConfig();

function getDatabaseConfig() {
    // FIX: config is inside "database"
    const config = fileConfig.database || {};

    const host = process.env.DB_HOST || config.host;
    const port = process.env.DB_PORT
        ? parseInt(process.env.DB_PORT, 10)
        : (config.port || 4000);

    const user = process.env.DB_USER || config.user;
    const password = process.env.DB_PASSWORD || config.password;
    const database = process.env.DB_NAME || config.database;
    const ssl = process.env.DB_SSL === 'true' || config.ssl === true;

    console.log("📦 DB CONFIG LOADED:", {
        host,
        port,
        user,
        database,
        ssl
    });

    if (!host) throw new Error("DB_HOST is missing");
    if (!user) throw new Error("DB_USER is missing");
    if (!database) throw new Error("DB_NAME is missing");

    return { host, port, user, password, database, ssl };
}

export async function initialize() {
    const { host, port, user, password, database, ssl } = getDatabaseConfig();

    console.log(`📡 Connecting to database at ${host}:${port}...`);

    // Only create DB locally (skip in production)
    if (process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1')) {
        try {
            const connection = await mysql.createConnection({
                host,
                port,
                user,
                password
            });

            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
            await connection.end();

            console.log('✅ Local database ensured');
        } catch (err: any) {
            console.log('⚠️ DB creation skipped:', err.message);
        }
    }

    // Sequelize connection (TiDB Cloud FIXED)
    const sequelize = new Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',

        dialectOptions: ssl
            ? {
                  ssl: {
                      minVersion: 'TLSv1.2',
                      rejectUnauthorized: false
                  }
              }
            : {},

        logging: false,

        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }

    // Models
    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);

    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // Sync database - ONLY in development, NEVER in production
    if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ alter: false });
        console.log('✅ Database schema synced');
    } else {
        console.log('⚠️ Database schema sync skipped (production mode)');
    }

    db.sequelize = sequelize;
}

// Auto initialize
initialize().catch((err) => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
});