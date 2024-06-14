module.exports = {
  root: true,

  extends: ['@ps73/eslint-config'],

  overrides: [
    {
      files: ['apps/backend/**/*'],

      parserOptions: {
        project: './apps/backend/tsconfig.json',
      },

      extends: ['@adonisjs/eslint-config/app'],
    },
  ],
};
