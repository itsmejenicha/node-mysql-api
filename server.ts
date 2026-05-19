import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import errorHandler from './_middleware/error-handler';
import accountsController from './accounts/accounts.controller';
//import swaggerDocs from './_helpers/swagger';

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
        : (origin, callback) => callback(null, true),
    credentials: true
}));

// routes
app.use('/accounts', accountsController);
//app.use('/api-docs', swaggerDocs);

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production'
    ? (process.env.PORT || 80)
    : 4000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production' && corsOrigin) {
        console.log(`CORS allowed origins: ${corsOrigin}`);
    }
});