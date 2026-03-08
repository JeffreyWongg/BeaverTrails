/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok domains for development
  allowedDevOrigins: [
    'dependable-hubert-unclamorously.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok.io',
  ],
};

export default nextConfig;
