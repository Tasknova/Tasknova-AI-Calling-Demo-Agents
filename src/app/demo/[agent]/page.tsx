'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Bot, Play, CheckCircle2, Shield, Loader2 } from 'lucide-react'
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
    displayName: 'Shriram_PFA',
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
    displayName: 'Collection Bot - JEW',
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
  // 'landing' | 'session'
  const [view, setView] = useState<'landing' | 'session'>('landing')

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
                      ⚠️ Agent not found in the database. Please sync agents first.
                    </p>
                    <Link
                      href="/admin/ai-calling-agents"
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl text-sm transition"
                    >
                      Go to Admin Panel
                    </Link>
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
              onEnd={() => setView('landing')}
            />
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
