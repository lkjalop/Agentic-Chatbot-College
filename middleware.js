export function middleware(request) {
  // Skip auth for API routes and static files
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('.')) {
    return
  }

  const authHeader = request.headers.get('authorization')
  
  // Get credentials from environment variables
  const USERNAME = process.env.BASIC_AUTH_USERNAME || 'student'
  const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'ea2024'
  
  const expectedAuth = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  
  if (authHeader !== expectedAuth) {
    return new Response('Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected Area"',
      },
    })
  }
}

export const config = {
  matcher: '/((?!api|_next/static|favicon.ico).*)',
}
