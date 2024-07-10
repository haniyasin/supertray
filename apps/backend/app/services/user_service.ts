import User from '#models/user';
import { CrudService } from '#services/crud_service';

export class UserService extends CrudService<typeof User, string> {
  constructor() {
    super(User, {
      idField: 'id',
      defaultSelectFields: ['firstName', 'lastName'],
      defaultFindLimit: 25,
      defaultSortField: 'createdAt',
      defaultSortDirection: 'desc',
    });
  }
}
