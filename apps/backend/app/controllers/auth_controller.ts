import { AuthService } from '#services/auth_service';
import {
  loginValidator,
  refreshTokenHeaderValidator,
  refreshTokenValidator,
  sendPasscodeValidator,
  signupValidator,
} from '#validators/auth';
import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class AuthController {
  constructor(protected authService: AuthService) {}

  async signup(ctx: HttpContext) {
    const data = await signupValidator.validate(ctx.request.all());
    const user = await this.authService.signup(data);
    return user.toJSON();
  }

  async login({ request }: HttpContext) {
    const data = await sendPasscodeValidator.validate(request.only(['email', 'passcode']));

    if (!data.passcode) {
      const result = await this.authService.sendLoginCode(data);
      return result;
    }

    const { email, passcode } = await loginValidator.validate(data);
    const result = await this.authService.login({ email, passcode });
    return {
      accessToken: result.accessToken.toJSON(),
      refreshToken: result.refreshToken,
      user: result.user.toJSON(),
    };
  }

  async logout({ response, auth }: HttpContext) {
    if (!auth.isAuthenticated) {
      return response.abort({ message: 'Not authenticated' }, 401);
    }

    try {
      await this.authService.logout({
        user: auth.user!,
        accessTokenId: auth.user!.currentAccessToken.identifier as number,
      });
      return { loggedOut: true };
    } catch (e) {
      return { loggedOut: true };
    }
  }

  async refresh({ request }: HttpContext) {
    const data = await refreshTokenValidator.validate(request.only(['refreshToken']));
    const headerAuth = await refreshTokenHeaderValidator.validate(request.headers());
    const result = await this.authService.refresh({
      refreshToken: data.refreshToken,
      accessToken: headerAuth.authorization,
    });
    return {
      accessToken: result.accessToken.toJSON(),
      refreshToken: result.refreshToken,
    };
  }
}
