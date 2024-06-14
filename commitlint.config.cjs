// If you want to implement custom scopes uncomment this
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    'scope-enum': async () => {
      return [2, 'always', ['backend']];
    },
  },
};
