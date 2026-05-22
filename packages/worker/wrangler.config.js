/**
 * @type {import('@cloudflare/workers-types').WranglerConfig}
 */
const config = {
  name: 'worker',
  account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
  auth_token: process.env.CLOUDFLARE_API_TOKEN,
  workers_dev: true,
  route: '',
  vars: {
    ENVIRONMENT: "production"
  }
};

export default config;
