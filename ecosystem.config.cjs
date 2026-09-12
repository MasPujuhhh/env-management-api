module.exports = {
  apps: [
    {
      name: 'wg-vault-api',
      script: 'dist/src/main.js',
      cwd: '/var/www/wg-vault/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
