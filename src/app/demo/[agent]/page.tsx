'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Bot, Play, CheckCircle2, Shield, Loader2, User, Phone, Mail, Globe, MessageSquare } from 'lucide-react'
import LivekitVoiceSession from '@/components/LivekitVoiceSession'

// ─── Agent configuration ────────────────────────────────────────────────────
const DEMO_AGENTS_MAP: Record<
  string,
  {
    nameMatch: string
    displayName: string
    category: string
    description: string
    capabilities: string[]
  }
> = {
  'shriram-pfa': {
    nameMatch: 'Shriram_PFA',
    displayName: 'Finance Agent',
    category: 'Financial / Customer Service',
    description: 'Assists customers with financial services, policy information and customer support.',
    capabilities: ['Account Enquiries', 'Policy Information', 'Billing & Payments'],
  },
  'demo-support': {
    nameMatch: 'Demo Support Agent',
    displayName: 'Demo Support Agent',
    category: 'Customer Support',
    description: 'Provides customer assistance and resolves general support queries.',
    capabilities: ['24/7 Issue Resolution', 'Product Guidance', 'Ticket Escalation'],
  },
  'hr-agent': {
    nameMatch: 'HR_agent',
    displayName: 'HR_agent',
    category: 'Interview / HR',
    description: 'Conducts interview screening and assists candidates during HR interactions.',
    capabilities: ['Candidate Screening', 'Interview Scheduling', 'FAQ Assistance'],
  },
  'cold-calling': {
    nameMatch: 'cold_calling_agent',
    displayName: 'cold_calling_agent',
    category: 'Sales',
    description: 'Performs lead outreach, sales conversations and customer qualification.',
    capabilities: ['Outbound Prospecting', 'Lead Qualification', 'Appointment Booking'],
  },
  'collection-bot': {
    nameMatch: 'Collection Bot - JEW',
    displayName: 'Collection Bot',
    category: 'Collections / Recovery',
    description: 'Handles payment reminders and collection-related conversations.',
    capabilities: ['Payment Reminders', 'Structured Follow-ups', 'Repayment Plans'],
  },
  'real-estate': {
    nameMatch: 'real_estate',
    displayName: 'real_estate',
    category: 'Industry Specific',
    description: 'Provides information regarding properties and assists potential buyers.',
    capabilities: ['Property Inquiry', 'Site Visit Scheduling', 'Pricing Details'],
  },
  'insurance-company': {
    nameMatch: 'insurance_company',
    displayName: 'insurance_company',
    category: 'Industry Specific',
    description: 'Assists customers with insurance policies, claims and general enquiries.',
    capabilities: ['Claims Status', 'Policy Recommendations', 'Premium Calculations'],
  },
}

interface AgentData {
  agent_id: string
  name: string
  status?: string
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DynamicDemoPage({ params }: { params: { agent: string } }) {
  const agentSlug = params.agent
  const agentConfig = DEMO_AGENTS_MAP[agentSlug]

  const [fetchedAgent, setFetchedAgent] = useState<AgentData | null>(null)
  const [loadingAgent, setLoadingAgent] = useState(true)
  // 'landing' | 'session' | 'contact'
  const [view, setView] = useState<'landing' | 'session' | 'contact'>('landing')

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', website: '', details: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/demo/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactForm, agentName: agentConfig?.displayName }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSubmitted(true)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch matching agent from backend
  useEffect(() => {
    if (!agentConfig) {
      setLoadingAgent(false)
      return
    }
    async function fetchAgentData() {
      try {
        const res = await fetch('/api/ai-agents/index')
        if (res.ok) {
          const result = await res.json()
          const agents: AgentData[] = result.agents || []
          const match = agents.find((a) => {
            const n1 = (a.name || '').toLowerCase().replace(/[\s_-]+/g, '')
            const n2 = agentConfig.nameMatch.toLowerCase().replace(/[\s_-]+/g, '')
            return n1 === n2 || n1.includes(n2) || n2.includes(n1)
          })
          if (match) setFetchedAgent(match)
        }
      } catch (err) {
        console.error('Error fetching agent:', err)
      } finally {
        setLoadingAgent(false)
      }
    }
    fetchAgentData()
  }, [agentConfig])

  // ── 404 fallback ─────────────────────────────────────────────────────────
  if (!agentConfig) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent Not Found</h2>
          <p className="text-gray-600 text-sm">
            The requested demo agent does not exist or is unavailable.
          </p>
        </div>
      </div>
    )
  }

  // ── Shared page shell ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Image
            src="/tasknova-logo-2.png"
            alt="TaskNova"
            width={160}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center space-y-8">

          {view === 'landing' && (
            <>
              {/* Agent Icon */}
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 flex items-center justify-center text-primary-600 mx-auto shadow-sm">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold uppercase tracking-wider">
                    {agentConfig.category}
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight pt-2">
                    🤖 {agentConfig.displayName}
                  </h1>
                  {!loadingAgent && fetchedAgent?.agent_id && (
                    <p className="text-xs text-gray-400 font-mono pt-1">
                      Agent ID: {fetchedAgent.agent_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                {agentConfig.description}
              </p>

              {/* Core Capabilities */}
              <div className="pt-2 pb-4 border-t border-b border-gray-100 max-w-lg mx-auto w-full">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Core Capabilities
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {agentConfig.capabilities.map((cap, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2">
                {loadingAgent ? (
                  <button
                    disabled
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-300 text-white font-semibold text-base flex items-center justify-center gap-2.5 mx-auto cursor-not-allowed"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading Agent...</span>
                  </button>
                ) : !fetchedAgent ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ This agent is currently unavailable. Please try again later.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setView('session')}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 mx-auto"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Try Live Demo</span>
                  </button>
                )}
              </div>
            </>
          )}

          {view === 'session' && fetchedAgent && (
            <LivekitVoiceSession
              agentId={fetchedAgent.agent_id}
              agentName={agentConfig.displayName}
              onEnd={() => setView('contact')}
            />
          )}

          {view === 'contact' && (
            <>
              {submitted ? (
                <div className="flex flex-col items-center gap-5 py-8">
                  <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Our team will reach out to you shortly. We&apos;re excited to show you what TaskNova can do.</p>
                  </div>
                  <button
                    onClick={() => { setView('landing'); setSubmitted(false); setContactForm({ name: '', phone: '', email: '', website: '', details: '' }) }}
                    className="mt-2 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition"
                  >
                    Try Demo Again
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-md mx-auto space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900">Interested? Let&apos;s Connect</h2>
                    <p className="text-gray-500 text-sm">Share your details and our team will get in touch with you.</p>
                  </div>
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-left">
                    {/* Name */}
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="text"
                        placeholder="Full Name *"
                        value={contactForm.name}
                        onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
                      />
                    </div>
                    {/* Phone */}
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="tel"
                        placeholder="Phone Number *"
                        value={contactForm.phone}
                        onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
                      />
                    </div>
                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="email"
                        placeholder="Work Email *"
                        value={contactForm.email}
                        onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
                      />
                    </div>
                    {/* Website */}
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        placeholder="Company Website (optional)"
                        value={contactForm.website}
                        onChange={e => setContactForm(p => ({ ...p, website: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
                      />
                    </div>
                    {/* Note */}
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        rows={3}
                        placeholder="Any additional notes... (optional)"
                        value={contactForm.details}
                        onChange={e => setContactForm(p => ({ ...p, details: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition resize-none"
                      />
                    </div>
                    {submitError && <p className="text-red-500 text-xs">{submitError}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {submitting ? 'Sending...' : 'Submit'}
                    </button>
                  </form>
                  <button
                    onClick={() => setView('landing')}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 transition pt-1"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-6 text-center text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
        <Shield className="w-4 h-4 text-gray-400" />
        <span>Powered by TaskNova AI</span>
      </footer>
    </div>
  )
}
