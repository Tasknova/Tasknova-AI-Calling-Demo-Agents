import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { agent_id } = await req.json()

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    const apiKey = process.env.INDUSLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'IndusLabs API key not configured' }, { status: 500 })
    }

    console.log(`[LiveKit Session] Starting session for agent: ${agent_id}`)

    const requestBody = {
      api_key: apiKey,
      agent_id,
      call_infields: {
        customer_name: 'Demo User',
        phone_number: '+919999999999',
        crm_id: 'DEMO_001',
      },
    }

    console.log('[LiveKit Session] Request body (redacted key):', {
      ...requestBody,
      api_key: '***',
    })

    const response = await fetch('https://developer.induslabs.io/api/livekit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // Log raw response text first before parsing
    const rawText = await response.text()
    console.log('[LiveKit Session] Raw IndusLabs response status:', response.status)
    console.log('[LiveKit Session] Raw IndusLabs response body:', rawText)

    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawText)
    } catch {
      console.error('[LiveKit Session] Response is not valid JSON:', rawText)
      return NextResponse.json(
        { error: `IndusLabs returned non-JSON response: ${rawText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    if (!response.ok) {
      console.error('[LiveKit Session] IndusLabs API error:', data)
      return NextResponse.json(
        { error: (data?.message as string) || (data?.error as string) || 'Failed to create LiveKit session' },
        { status: response.status }
      )
    }

    // The actual payload is nested inside data.data — extract it first
    const payload: Record<string, unknown> =
      (data.data && typeof data.data === 'object')
        ? (data.data as Record<string, unknown>)
        : data

    console.log('[LiveKit Session] Resolved payload keys:', Object.keys(payload))

    // Resolve token — check all known field names
    const token =
      (payload.token as string) ||
      (payload.access_token as string) ||
      (payload.livekit_token as string) ||
      (payload.jwt as string) ||
      null

    // Resolve host URL — check all known field names
    const livekitHost =
      (payload.livekit_host_url as string) ||
      (payload.livekit_url as string) ||
      (payload.livekit_host as string) ||
      (payload.host as string) ||
      (payload.wsUrl as string) ||
      (payload.ws_url as string) ||
      (payload.url as string) ||
      null

    if (!token || !livekitHost) {
      console.error('[LiveKit Session] Could not resolve token or host. Payload keys:', Object.keys(payload))
      console.error('[LiveKit Session] Full response data:', JSON.stringify(data, null, 2))
      return NextResponse.json(
        {
          error: `Could not find token or host. Top-level keys: [${Object.keys(data).join(', ')}] | Payload keys: [${Object.keys(payload).join(', ')}]`,
          debug_response: data,
        },
        { status: 502 }
      )
    }

    console.log(`[LiveKit Session] Session created — host: ${livekitHost}`)

    return NextResponse.json({
      token,
      livekit_host_url: livekitHost,
    })
  } catch (error) {
    console.error('[LiveKit Session] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
