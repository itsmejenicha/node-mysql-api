"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const error_handler_1 = __importDefault(require("./_middleware/error-handler"));
const accounts_controller_1 = __importDefault(require("./accounts/accounts.controller"));
const app = (0, express_1.default)();
// middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN;
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? (corsOrigin ? corsOrigin.split(',').map(x => x.trim()) : [])
        : true,
    credentials: true
}));
// routes
app.use('/accounts', accounts_controller_1.default);
// global error handler
app.use(error_handler_1.default);
// start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production' && corsOrigin) {
        console.log(`CORS allowed origins: ${corsOrigin}`);
    }
});
