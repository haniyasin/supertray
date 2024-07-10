import { UserService } from '#services/user_service';
import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class UsersController {
  constructor(protected userService: UserService) {}

  async find(ctx: HttpContext) {
    const { $page, $limit, ...params } = ctx.request.qs();
    const users = await this.userService.find({
      ...params,
      $page: $page && Number($page),
      $limit: $limit && Number($limit),
    });
    return users.toJSON();
  }
}
