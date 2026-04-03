import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: 'Password is required' }, { status: 400 })
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }

  return Response.json({ success: true, token: password }, { status: 200 })
}
