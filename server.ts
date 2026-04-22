import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import errorHandler from './_middleware/error-handler';
import accountsController from './accounts/accounts.controller';
import swaggerDocs from './_helpers/swagger';

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(cors({
    origin: true,
    credentials: true
}));

// routes
app.use('/accounts', accountsController);
app.use('/api-docs', swaggerDocs);

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production'
    ? (process.env.PORT || 80)
    : 4000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});