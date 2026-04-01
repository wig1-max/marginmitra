import { Request } from 'express';

import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user';

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

