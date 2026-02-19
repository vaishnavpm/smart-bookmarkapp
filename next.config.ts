import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from MIME-sniffing the content type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Disallow embedding this app in an iframe (clickjacking protection)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Send only origin on cross-origin requests, full URL on same-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict access to browser features not used by this app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Enable browser DNS prefetch for performance
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
