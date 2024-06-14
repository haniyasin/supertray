import User from '#models/user';
import env from '#start/env';
import { loginValidator, sendPasscodeValidator, signupValidator } from '#validators/auth';
import type { HttpContext } from '@adonisjs/core/http';
import mail from '@adonisjs/mail/services/main';
import { DateTime } from 'luxon';

export default class AuthController {
  async signup(ctx: HttpContext) {
    const data = await signupValidator.validate(ctx.request.all());
    const user = await User.create(data);
    return user;
  }

  async login({ request, response, logger }: HttpContext) {
    const data = await sendPasscodeValidator.validate(request.only(['email', 'passcode']));

    if (!data.passcode) {
      const user = await User.findBy('email', data.email);

      if (!user) {
        response.abort({ message: 'User not found' }, 404);
        return;
      }

      const { id } = user;
      // 8 digit random code only numbers
      const useDebugPasscode =
        env.get('AUTH_DEBUG_PASSCODE') &&
        ['development', 'test'].includes(env.get('NODE_ENV')) &&
        env.get('AUTH_DEBUG_PASSCODE')!.toString();
      const code =
        useDebugPasscode ||
        Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0');
      user.passcode = code;
      user.passcodeExpiresAt = DateTime.now().plus({ minutes: 10 });
      await user.save();

      if (!useDebugPasscode) {
        await mail.sendLater((msg) => {
          msg
            .to(data.email)
            .from('staging@stagingx.de')
            .subject('Your login code')
            .html(`<p>Your login code is: ${code}</p>`);
        });
      }

      return {
        id,
      };
    }

    const { email, passcode } = await loginValidator.validate(data);

    try {
      const user = await User.verifyCredentials(email, passcode);
      const passcodeIsExpireed = user.passcodeExpiresAt && user.passcodeExpiresAt < DateTime.now();

      if (passcodeIsExpireed) {
        user.passcode = null;
        user.passcodeExpiresAt = null;
        await user.save();
        return response.abort({ message: 'Invalid credentials' }, 401);
      }

      const accessToken = await User.accessTokens.create(user, ['*'], {
        expiresIn: '30 days',
      });

      user.passcode = null;
      user.passcodeExpiresAt = null;
      await user.save();

      return {
        accessToken,
        user,
      };
    } catch (e) {
      logger.debug(e);
      return response.abort({ message: 'Invalid credentials' }, 401);
    }
  }

  async logout({ response, auth }: HttpContext) {
    if (!auth.isAuthenticated) {
      return response.abort({ message: 'Not authenticated' }, 401);
    }

    try {
      await User.accessTokens.delete(auth.user!, auth.user!.currentAccessToken.identifier);

      return {
        loggedOut: true,
      };
    } catch (e) {
      return {
        loggedOut: true,
      };
    }
  }
}
