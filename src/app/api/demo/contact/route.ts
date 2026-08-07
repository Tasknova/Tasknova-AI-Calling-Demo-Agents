import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const body = await req.json()
    const { name, phone, email, website, details, agentName } = body

    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: 'Name, phone, and email are required.' },
        { status: 400 }
      )
    }

    const htmlContent = `
      <h2>New Demo Lead Form Submission</h2>
      <p><strong>Agent Demoed:</strong> ${agentName || 'N/A'}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company Website:</strong> ${website || 'N/A'}</p>
      <p><strong>More Details:</strong><br/> ${details || 'N/A'}</p>
    `

    const { data, error } = await resend.emails.send({
      from: 'TaskNova <noreply@tasknova.io>',
      to: 'contact.tasknova@gmail.com',
      subject: `New Demo Lead: ${name} (${agentName || 'Unknown Agent'})`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
