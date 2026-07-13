import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';
import AppointmentsService from '../../backend/src/services/appointmentsService.js';
import AuthService from '../../backend/src/services/authService.js';
import { AppError } from '../../backend/src/lib/errors.js';
import { ZodError } from 'zod';
import {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateListAppointmentsQuery
} from '../../backend/src/validators/appointments.schema.js';

const router = new Hono();

// Centralized error handler for agendamentos route
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
  console.error("Agendamento Route Error:", err);
  return c.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, 500);
});

// GET /agendamentos
router.get('/', authMiddleware, async (c) => {
  const userPayload = c.get('user');
  const fullUser = await AuthService.getCurrentUser(userPayload.userId);
  
  const queryParams = c.req.query();
  const validatedQuery = validateListAppointmentsQuery(queryParams);
  
  const appointments = await AppointmentsService.listAppointments(validatedQuery, fullUser);
  return c.json(appointments);
});

// POST /agendamentos
router.post('/', authMiddleware, async (c) => {
  const userPayload = c.get('user');
  const fullUser = await AuthService.getCurrentUser(userPayload.userId);
  
  const body = await c.req.json();
  const validatedBody = validateCreateAppointment(body);
  
  const created = await AppointmentsService.createAppointment(validatedBody, fullUser);
  return c.json(created, 201);
});

// PUT /agendamentos/:id and PATCH /agendamentos/:id
const handleUpdate = async (c) => {
  const { id } = c.req.param();
  const userPayload = c.get('user');
  const fullUser = await AuthService.getCurrentUser(userPayload.userId);
  
  const body = await c.req.json();
  const validatedBody = validateUpdateAppointment(body);
  
  const updated = await AppointmentsService.updateAppointment(id, validatedBody, fullUser);
  return c.json(updated);
};

router.put('/:id', authMiddleware, handleUpdate);
router.patch('/:id', authMiddleware, handleUpdate);

// DELETE /agendamentos/:id
router.delete('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const userPayload = c.get('user');
  const fullUser = await AuthService.getCurrentUser(userPayload.userId);
  
  await AppointmentsService.deleteAppointment(id, fullUser);
  return c.body(null, 204);
});

export default router;
