import User from '#models/user';
import vine from '@vinejs/vine';

/**
 * Validates the login action
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    passcode: vine.string(),
  }),
);

export const sendPasscodeValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    passcode: vine.string().optional(),
  }),
);

export const signupValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .unique(async (_, value) => {
        const user = await User.findBy('email', value);
        return !user;
      }),
    firstName: vine.string(),
    lastName: vine.string(),
  }),
);
