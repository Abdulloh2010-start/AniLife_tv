import { NextResponse } from 'next/server'

export function middleware(req) {
  const userAgent = req.headers.get('user-agent') || ''
  const botPattern = /(googlebot|bingbot|yahoo|baiduspider|yandex|duckduckbot|slurp|facebot|twitterbot)/i

  if (botPattern.test(userAgent)) {
    return NextResponse.rewrite(`https://service.prerender.io${req.nextUrl.pathname}`)
  }

  return NextResponse.next()
}