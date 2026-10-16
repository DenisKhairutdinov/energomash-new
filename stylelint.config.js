/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
  plugins: ['stylelint-use-logical'],
  ignoreFiles: ['dist/**', 'node_modules/**', 'database/**', '.claude/**', 'design-variants/**'],
  rules: {
    'csstools/use-logical': ['always', { severity: 'warning' }],
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
      { message: 'Используйте БЭМ в kebab-case: block__element--modifier' },
    ],
    'declaration-no-important': true,
    'max-nesting-depth': [3, { ignore: ['pseudo-classes'] }],
    'selector-max-id': 0,
    'color-named': 'never',
    'color-function-notation': 'modern',
    'font-weight-notation': 'numeric',
    'declaration-property-value-disallowed-list': { transition: ['/\\ball\\b/'] },
    'scss/at-mixin-pattern': null,
    'scss/dollar-variable-pattern': null,
  },
}
