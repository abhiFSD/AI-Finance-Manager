import express from 'express';
import authRouter from './auth';
import documentsRouter from './documents';
import accountsRouter from './accounts';
import categoriesRouter from './categories';
import budgetsRouter from './budgets';
import transactionsRouter from './transactions';
import dashboardRouter from './dashboard';

const router = express.Router();

// Mount individual route modules
router.use('/auth', authRouter);
router.use('/documents', documentsRouter);
router.use('/accounts', accountsRouter);
router.use('/categories', categoriesRouter);
router.use('/budgets', budgetsRouter);
router.use('/transactions', transactionsRouter);
router.use('/dashboard', dashboardRouter);

export default router;