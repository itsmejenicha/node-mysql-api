import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import errorHandler from './_middleware/error-handler';
import accountsController from './accounts/accounts.controller';

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN;

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (corsOrigin ? corsOrigin.split(',').map(x => x.trim()) : false)
        : true,
    credentials: true
}));

// routes
app.use('/accounts', accountsController);

// global error handler
app.use(errorHandler);

// start server
const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Environment: process.env.NODE_ENV || 'development'`);
    if (process.env.NODE_ENV === 'production' && corsOrigin) {
        console.log(`CORS allowed origins: ${corsOrigin}`);
    }
});
