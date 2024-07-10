import AuthAccessToken from '#models/auth_access_token';
import User from '#models/user';
import env from '#start/env';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import encryption from '@adonisjs/core/services/encryption';
import mail from '@adonisjs/mail/services/main';
import { DateTime } from 'luxon';

export type LoginData = {
  email: string;
  passcode: string;
};

export type SignupData = {
  email: string;
  firstName: string;
  lastName: string;
};

export type DecryptedRefreshToken = {
  i: number;
  c: number;
};

const errors = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
};

export class AuthService {
  errors = errors;

  createRefreshToken(accessTokenId: number) {
    const payload: DecryptedRefreshToken = {
      i: accessTokenId,
      c: DateTime.now().toMillis(),
    };
    const refreshToken = `oar_${encryption.encrypt(payload)}`;
    return refreshToken;
  }

  async signup(data: SignupData) {
    const user = await User.create(data);
    return user;
  }

  async login(data: LoginData) {
    const { email, passcode } = data;

    try {
      const user = await User.verifyCredentials(email, passcode);
      const passcodeIsExpired = user.passcodeExpiresAt && user.passcodeExpiresAt < DateTime.now();

      if (passcodeIsExpired) {
        user.passcode = null;
        user.passcodeExpiresAt = null;
        await user.save();
        throw new Error(this.errors.INVALID_CREDENTIALS);
      }

      const accessToken = await User.accessTokens.create(user, ['*'], {
        expiresIn: env.get('AUTH_ACCESS_TOKEN_EXPIRES_IN'),
      });

      const refreshToken = this.createRefreshToken(accessToken.identifier as number);

      user.passcode = null;
      user.passcodeExpiresAt = null;
      await Promise.all([user.save(), user.load('tenants')]);
      await Promise.all(user.tenants.map((tenant) => tenant.load('tenant')));

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (e) {
      throw new Error(this.errors.INVALID_CREDENTIALS);
    }
  }

  async sendLoginCode(data: Pick<LoginData, 'email'>) {
    const user = await User.findBy('email', data.email);

    if (!user) {
      throw new Error(this.errors.USER_NOT_FOUND);
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

    await mail.sendLater((msg) => {
      msg
        .to(data.email)
        .from(env.get('EMAIL_FROM'))
        .subject('Your login code')
        .html(`<p>Your login code is: ${code}</p>`);
    });

    return {
      id,
    };
  }

  async logout(data: { user: User; accessTokenId: number }) {
    try {
      await AuthAccessToken.query()
        .delete()
        .where('id', data.accessTokenId)
        .andWhere('tokenable_id', data.user.id)
        .exec();
    } catch (e) {
      throw new Error(this.errors.INVALID_CREDENTIALS);
    }
  }

  async refresh(data: { refreshToken: string; accessToken: string }) {
    const decrypted = encryption.decrypt<DecryptedRefreshToken>(data.refreshToken.replace('oar_', ''));
    if (!decrypted) {
      throw new Error(this.errors.INVALID_REFRESH_TOKEN);
    }
    const accessToken = await AuthAccessToken.findBy('id', decrypted.i);

    if (!accessToken) {
      throw new Error(this.errors.INVALID_REFRESH_TOKEN);
    }
    const user = await User.findBy('id', accessToken.tokenableId);

    if (!user) {
      throw new Error(this.errors.INVALID_REFRESH_TOKEN);
    }

    const newAccessToken = await DbAccessTokensProvider.forModel(User).create(user, accessToken.abilities, {
      name: accessToken.name || undefined,
      expiresIn: '3 days',
    });

    const refreshToken = this.createRefreshToken(newAccessToken.identifier as number);

    await DbAccessTokensProvider.forModel(User).delete(user, accessToken.id);

    return {
      accessToken: newAccessToken,
      refreshToken,
    };
  }
}
