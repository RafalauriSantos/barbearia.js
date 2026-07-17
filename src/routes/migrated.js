import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache.middleware.js';
import { clearStaticCache } from '../utils/cache.util.js';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware.js';
import { AppError } from '../../backend/src/lib/errors.js';
import { ZodError } from 'zod';

// Controllers
import profileController from '../../backend/src/controllers/profileController.js';
import expensesController from '../../backend/src/controllers/expensesController.js';
import paymentMethodsController from '../../backend/src/controllers/paymentMethodsController.js';
import productsController from '../../backend/src/controllers/productsController.js';
import barbersController from '../../backend/src/controllers/barbersController.js';
import clientsController from '../../backend/src/controllers/clientsController.js';
import financialController from '../../backend/src/controllers/financialController.js';
import receivablesController from '../../backend/src/controllers/receivablesController.js';
import supplierPayablesController from '../../backend/src/controllers/supplierPayablesController.js';
import invitesController from '../../backend/src/controllers/invitesController.js';

export function adaptController(controllerFn) {
  return async (c) => {
    const request = {
      user: c.get('user'),
      query: c.req.query(),
      params: c.req.param(),
      body: undefined,
      env: c.env,
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      try {
        request.body = await c.req.json();
      } catch (e) {
        request.body = {};
      }
    }
    
    let statusCode = 200;
    let sentData = undefined;
    
    const reply = {
      code(status) {
        statusCode = status;
        return this;
      },
      status(status) {
        statusCode = status;
        return this;
      },
      send(data) {
        sentData = data;
        return this;
      }
    };
    
    try {
      const result = await controllerFn(request, reply);
      const finalData = sentData !== undefined ? sentData : result;
      
      if (statusCode === 204 || finalData === null || finalData === undefined) {
        return c.body(null, statusCode || 204);
      }
      
      return c.json(finalData, statusCode);
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.message, code: err.code }, err.status);
      }
      if (err instanceof ZodError) {
        return c.json({
          error: "Validation error",
          code: "VALIDATION_ERROR",
          issues: err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }, 400);
      }
      console.error("adaptController Error:", err);
      return c.json(
        { error: err.message || "Internal Server Error", code: "INTERNAL_ERROR" },
        500
      );
    }
  };
}

const router = new Hono();

// Centralized error handler
router.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({
      error: "Validation error",
      code: "VALIDATION_ERROR",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }, 400);
  }
  console.error("Migrated Route Error:", err);
  return c.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, 500);
});

// Profile
router.get('/profile', authMiddleware, adaptController(profileController.get));
router.put('/profile', authMiddleware, adaptController(profileController.update));

// Expenses
router.get('/expenses', authMiddleware, adaptController(expensesController.list));
router.post('/expenses', authMiddleware, adaptController(expensesController.create));
router.put('/expenses/:id', authMiddleware, adaptController(expensesController.update));
router.delete('/expenses/:id', authMiddleware, adaptController(expensesController.remove));

// Payment Methods
router.get('/payment-methods', authMiddleware, adaptController(paymentMethodsController.list));
router.patch('/payment-methods/:id', authMiddleware, adaptController(paymentMethodsController.update));

// Products
router.get('/products', authMiddleware, cacheMiddleware, adaptController(productsController.list));

router.post('/products', authMiddleware, rateLimitMiddleware, async (c) => {
  const res = await adaptController(productsController.create)(c);
  if (res.status === 201) {
    await clearStaticCache(c, '/products');
  }
  return res;
});

router.put('/products/:id', authMiddleware, rateLimitMiddleware, async (c) => {
  const res = await adaptController(productsController.update)(c);
  if (res.status === 200) {
    await clearStaticCache(c, '/products');
  }
  return res;
});

router.delete('/products/:id', authMiddleware, rateLimitMiddleware, async (c) => {
  const res = await adaptController(productsController.remove)(c);
  if (res.status === 204) {
    await clearStaticCache(c, '/products');
  }
  return res;
});

// Barbers
router.get('/barbers', authMiddleware, adaptController(barbersController.list));
router.post('/barbers', authMiddleware, adaptController(barbersController.create));
router.patch('/barbers/:id', authMiddleware, adaptController(barbersController.update));
router.post('/barbers/:id/invite', authMiddleware, adaptController(barbersController.invite));

// Clients
router.get('/clients/fixed', authMiddleware, adaptController(clientsController.listFixed));
router.post('/clients/fixed', authMiddleware, adaptController(clientsController.createFixed));
router.put('/clients/fixed/:id', authMiddleware, adaptController(clientsController.updateFixed));
router.delete('/clients/fixed/:id', authMiddleware, adaptController(clientsController.removeFixed));

router.post('/clients/fixed/:id/cuts', authMiddleware, adaptController(clientsController.createCut));
router.put('/clients/fixed/:id/cuts/:cutId', authMiddleware, adaptController(clientsController.updateCut));
router.delete('/clients/fixed/:id/cuts/:cutId', authMiddleware, adaptController(clientsController.removeCut));

router.get('/clients/waitlist', authMiddleware, adaptController(clientsController.listWaitlist));
router.post('/clients/waitlist', authMiddleware, adaptController(clientsController.createWaitlist));
router.put('/clients/waitlist/:id', authMiddleware, adaptController(clientsController.updateWaitlist));
router.delete('/clients/waitlist/:id', authMiddleware, adaptController(clientsController.removeWaitlist));

// Financial
router.get('/financial/summary', authMiddleware, adaptController(financialController.summary));

// Receivables
router.get('/receivables', authMiddleware, adaptController(receivablesController.list));
router.post('/receivables/:id/receive', authMiddleware, adaptController(receivablesController.receive));

// Supplier Payables
router.get('/supplier-payables', authMiddleware, adaptController(supplierPayablesController.list));
router.post('/supplier-payables/:id/pay', authMiddleware, adaptController(supplierPayablesController.pay));

// Invites (Public)
router.get('/invites/:token', adaptController(invitesController.get));
router.post('/invites/:token/accept', adaptController(invitesController.accept));

export default router;
