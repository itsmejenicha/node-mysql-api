"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = initialize;
const promise_1 = __importDefault(require("mysql2/promise"));
const sequelize_1 = require("sequelize");
const account_model_1 = __importDefault(require("../accounts/account.model"));
const refresh_token_model_1 = __importDefault(require("../accounts/refresh-token.model"));
const db = {};
exports.default = db;
// =========================
// DATABASE CONFIG (ENV ONLY)
// =========================
function getDatabaseConfig() {
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT || 4000);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    // TiDB requires SSL
    const ssl = process.env.DB_SSL === 'true';
    console.log("📦 DB CONFIG LOADED:", {
        host,
        port,
        user,
        database,
        ssl
    });
    if (!host)
        throw new Error("DB_HOST is missing");
    if (!user)
        throw new Error("DB_USER is missing");
    if (!password)
        throw new Error("DB_PASSWORD is missing");
    if (!database)
        throw new Error("DB_NAME is missing");
    return { host, port, user, password, database, ssl };
}
// =========================
// INITIALIZE DATABASE
// =========================
async function initialize() {
    const { host, port, user, password, database, ssl } = getDatabaseConfig();
    console.log(`📡 Connecting to database at ${host}:${port}...`);
    // OPTIONAL: Create DB locally only
    if (process.env.NODE_ENV !== 'production' &&
        (host === 'localhost' || host === '127.0.0.1')) {
        try {
            const connection = await promise_1.default.createConnection({
                host,
                port,
                user,
                password
            });
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
            await connection.end();
            console.log('✅ Local database ensured');
        }
        catch (err) {
            console.log('⚠️ DB creation skipped:', err.message);
        }
    }
    // =========================
    // SEQUELIZE CONNECTION (FIXED FOR TIDB)
    // =========================
    const sequelize = new sequelize_1.Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        dialectOptions: {
            ssl: ssl
                ? {
                    require: true,
                    rejectUnauthorized: false
                }
                : undefined
        },
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
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
    // =========================
    // MODELS
    // =========================
    db.Account = (0, account_model_1.default)(sequelize);
    db.RefreshToken = (0, refresh_token_model_1.default)(sequelize);
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    // =========================
    // SYNC (DEV ONLY)
    // =========================
    if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ alter: false });
        console.log('✅ Database schema synced');
    }
    else {
        console.log('⚠️ Database schema sync skipped (production mode)');
    }
    db.sequelize = sequelize;
}
// Auto initialize
initialize().catch((err) => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
});
