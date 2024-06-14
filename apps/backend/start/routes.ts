import { middleware } from '#start/kernel';
import router from '@adonisjs/core/services/router';

/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
const AuthController = () => import('#controllers/auth_controller');

router
  .group(() => {
    router.get('/ping', () => 'pong');

    router
      .group(() => {
        router.post('/login', [AuthController, 'login']);
        router.post('/signup', [AuthController, 'signup']);
        router.delete('/logout', [AuthController, 'logout']).use(
          middleware.auth({
            guards: ['api'],
          }),
        );
      })
      .prefix('auth');

    router
      .group(() => {
        // router.post('/', [WorkspacesController, 'create']);
      })
      .prefix('workspaces')
      .use(
        middleware.auth({
          guards: ['api'],
        }),
      );
  })
  .prefix('api');
