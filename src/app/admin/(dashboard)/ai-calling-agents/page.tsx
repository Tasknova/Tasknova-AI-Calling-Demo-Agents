'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Bot, ExternalLink, Sparkles, RefreshCw } from 'lucide-react'

interface Agent {
  agent_id: string
  name: string
  status?: string
  is_active?: boolean
  created_at?: string
}

// Configuration map for target demo agents
const DEMO_AGENTS_CONFIG: Record<
  string,
  {
    nameMatch: string
    displayName: string
    description: string
    route: string
    gradient: string
  }
> = {
  Shriram_PFA: {
    nameMatch: 'Shriram_PFA',
    displayName: 'Finance Agent',
    description: 'Financial Assistance & Customer Support',
    route: '/demo/shriram-pfa',
    gradient: 'from-blue-600 to-indigo-600',
  },
  'Demo Support Agent': {
    nameMatch: 'Demo Support Agent',
    displayName: 'Demo Support Agent',
    description: 'General Customer Support',
    route: '/demo/demo-support',
    gradient: 'from-purple-600 to-pink-600',
  },
  HR_agent: {
    nameMatch: 'HR_agent',
    displayName: 'HR Agent',
    description: 'Interview Screening Assistant',
    route: '/demo/hr-agent',
    gradient: 'from-emerald-600 to-teal-600',
  },
  cold_calling_agent: {
    nameMatch: 'cold_calling_agent',
    displayName: 'Cold Calling Agent',
    description: 'Sales & Lead Outreach',
    route: '/demo/cold-calling',
    gradient: 'from-amber-500 to-orange-600',
  },
  'Collection Bot - JEW': {
    nameMatch: 'Collection Bot - JEW',
    displayName: 'Collection Bot',
    description: 'Collections & Payment Recovery',
    route: '/demo/collection-bot',
    gradient: 'from-red-600 to-rose-600',
  },
  real_estate: {
    nameMatch: 'real_estate',
    displayName: 'Real Estate',
    description: 'Property Sales Assistant',
    route: '/demo/real-estate',
    gradient: 'from-cyan-600 to-blue-600',
  },
  insurance_company: {
    nameMatch: 'insurance_company',
    displayName: 'Insurance Company',
    description: 'Assists customers with insurance enquiries, policy information, policy recommendations, and claim-related support.',
    route: '/demo/insurance-company',
    gradient: 'from-violet-600 to-purple-600',
  },
}

export default function AICallingAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-agents/index')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const result = await response.json()
      setAgents(result.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error('Failed to load demo agents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Helper to normalize strings for comparison (case & whitespace insensitive)
  const normalize = (str: string) => str.toLowerCase().replace(/[\s_-]+/g, '')

  // Filter agents matching target names
  const displayedDemoAgents = Object.entries(DEMO_AGENTS_CONFIG).map(
    ([key, config]) => {
      const fetchedAgent = agents.find((a) => {
        const name1 = normalize(a.name || '')
        const name2 = normalize(config.nameMatch)
        return name1 === name2 || name1.includes(name2) || name2.includes(name1)
      })

      return {
        key,
        config,
        agent: fetchedAgent || null,
      }
    }
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Demo Showcase
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Demo Agents
            </h1>
            <p className="text-purple-100 text-base sm:text-lg font-light leading-relaxed">
              Explore interactive AI calling agents designed for specialized industry roles, sales outreach, customer support, and automated recovery.
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true)
              fetchAgents()
            }}
            disabled={refreshing || loading}
            className="self-start md:self-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition duration-200 backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Loading agents...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDemoAgents.map(({ key, config, agent }) => {
            const isActive = agent ? agent.status !== 'inactive' && agent.is_active !== false : true
            const statusLabel = isActive ? 'Active' : 'Inactive'

            return (
              <div
                key={key}
                className="group relative bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top status & badge */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-md`}>
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        {isActive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isActive ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        🟢 {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Agent Details */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {config.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 font-medium leading-relaxed">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <Link
                    href={config.route}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Open Demo</span>
                    <ExternalLink className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
