import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createHrSchema, resetPasswordSchema } from './users.schema.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.use(mustChangePasswordGuard);
usersRouter.use(requireRole(['admin']));

usersRouter.get('/', UsersController.getUsers);
usersRouter.post('/hr', validate(createHrSchema), UsersController.createHr);
usersRouter.patch('/:id/deactivate', UsersController.toggleDeactivate);
usersRouter.post('/:id/reset-password', validate(resetPasswordSchema), UsersController.resetPassword);
