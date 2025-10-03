module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Customize Airbnb rules as needed
    'class-methods-use-this': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Allow console.log in development
    'no-console': 'off',
    
    // Relax some strict rules for better development experience
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', { 
      code: 120, 
      ignoreUrls: true, 
      ignoreStrings: true, 
      ignoreTemplateLiterals: true 
    }],
    
    // Allow underscore dangle for private methods
    'no-underscore-dangle': ['error', { 
      allow: ['_id', '_doc', '__dirname', '__filename'] 
    }],
    
    // Allow function declarations to be used before they are defined
    'no-use-before-define': ['error', { 
      functions: false, 
      classes: true, 
      variables: true 
    }],
    
    // Allow reassigning function parameters for middleware
    'no-param-reassign': ['error', { 
      props: true, 
      ignorePropertyModificationsFor: ['req', 'res', 'next'] 
    }],
    
    // Allow async functions without await
    'require-await': 'off',
    
    // Allow consistent return in async functions
    'consistent-return': 'off',
    
    // Allow nested ternary for simple cases
    'no-nested-ternary': 'warn',
    
    // Allow multiple classes per file
    'max-classes-per-file': 'off',
    
    // Allow both named and default exports
    'import/prefer-default-export': 'off',
    
    // Allow devDependencies in test files
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/test/**',
        '**/__tests__/**',
        '**/jest.config.js',
        '**/jest.setup.js'
      ]
    }]
  },
  overrides: [
    {
      // Test files can have additional relaxed rules
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      rules: {
        'no-unused-expressions': 'off',
        'max-len': 'off'
      }
    }
  ]
};