/**
 * SSO Management Dashboard
 * Admin interface for SSO configuration and management
 */

"use client";

// Force dynamic rendering to prevent prerendering issues with auth
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { 
  SSOProvider, 
  Organization, 
  DomainVerification,
  SSOConfig 
} from '@/lib/types/auth';
// SSO provider status will be fetched from secure API
import {
  Shield,
  Globe,
  Key,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react';

interface SSOStats {
  total_logins: number;
  google_logins: number;
  microsoft_logins: number;
  success_rate: number;
  active_sessions: number;
}

interface SSOProviderInfo {
  provider: SSOProvider;
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  configured: boolean;
}

export default function SSOManagementPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'domains' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [domains, setDomains] = useState<DomainVerification[]>([]);
  const [stats, setStats] = useState<SSOStats | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [ssoProviders, setSSOProviders] = useState<SSOProviderInfo[]>([]);
  
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load SSO provider status from secure API
      const providersResponse = await fetch('/api/auth/sso-providers');
      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        if (providersData.success) {
          setSSOProviders(providersData.providers);
        }
      }

      // Load organizations, domains, and stats
      // This would be actual API calls in production
      setStats({
        total_logins: 1250,
        google_logins: 780,
        microsoft_logins: 470,
        success_rate: 98.5,
        active_sessions: 245
      });
      
      setOrganizations([
        {
          id: '1',
          name: 'Acme University',
          domain: 'acme.edu',
          logo_url: null,
          sso_enabled: true,
          sso_provider: SSOProvider.GOOGLE,
          sso_config: null,
          mfa_required: true,
          mfa_methods: [],
          domain_verified: true,
          auto_provisioning: true,
          default_role: 'student' as any,
          session_timeout: 3600000,
          password_policy: null as any,
          audit_logging: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
      
      setDomains([
        {
          id: '1',
          organization_id: '1',
          domain: 'acme.edu',
          verification_token: 'vt_123456789',
          verification_method: 'dns',
          verified: true,
          verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    } catch (error) {
      console.error('Failed to load SSO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'indigo' }: {
    title: string;
    value: string | number;
    icon: any;
    color?: string;
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const ProviderCard = ({ providerInfo }: {
    providerInfo: SSOProviderInfo;
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: providerInfo.color + '20' }}
          >
            <div 
              className="w-6 h-6 rounded"
              style={{ backgroundColor: providerInfo.color }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{providerInfo.name}</h3>
            <p className="text-sm text-gray-600">{providerInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {providerInfo.enabled ? (
            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
              Enabled
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
              Disabled
            </span>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Client ID</label>
          <div className="mt-1 flex">
            <input
              type={showSecrets[providerInfo.provider] ? 'text' : 'password'}
              value={providerInfo.configured ? "oauth2_client_id_configured" : "Not configured"}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50"
            />
            <button
              onClick={() => setShowSecrets(prev => ({ ...prev, [providerInfo.provider]: !prev[providerInfo.provider] }))}
              className="px-3 py-2 border-t border-r border-b border-gray-300 bg-gray-50 text-gray-500 hover:text-gray-700"
            >
              {showSecrets[providerInfo.provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button className="px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Redirect URI:</span>
          <code className="px-2 py-1 bg-gray-100 rounded text-xs">
            /api/auth/callback/{providerInfo.provider}
          </code>
        </div>
      </div>
    </div>
  );

  const OrganizationRow = ({ org }: { org: Organization }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{org.name}</div>
            <div className="text-sm text-gray-500">{org.domain}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {org.sso_enabled ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {org.sso_provider}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Disabled
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {org.domain_verified ? (
          <span className="text-green-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Verified
          </span>
        ) : (
          <span className="text-yellow-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Pending
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {org.mfa_required ? (
          <span className="text-green-600 flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            Required
          </span>
        ) : (
          <span className="text-gray-500">Optional</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
          <Edit className="w-4 h-4" />
        </button>
        <button className="text-red-600 hover:text-red-900">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SSO Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Configure and manage Single Sign-On providers and domain verification
                </p>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export Config
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Globe },
              { id: 'providers', name: 'Providers', icon: Key },
              { id: 'domains', name: 'Domains', icon: Shield },
              { id: 'audit', name: 'Audit Logs', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total SSO Logins"
                value={stats?.total_logins || 0}
                icon={Users}
                color="indigo"
              />
              <StatCard
                title="Google Logins"
                value={stats?.google_logins || 0}
                icon={Globe}
                color="blue"
              />
              <StatCard
                title="Microsoft Logins"
                value={stats?.microsoft_logins || 0}
                icon={Shield}
                color="green"
              />
              <StatCard
                title="Success Rate"
                value={`${stats?.success_rate || 0}%`}
                icon={CheckCircle}
                color="emerald"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent SSO Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { user: 'john@acme.edu', provider: 'Google', time: '2 minutes ago', status: 'success' },
                    { user: 'sarah@company.com', provider: 'Microsoft', time: '5 minutes ago', status: 'success' },
                    { user: 'mike@university.edu', provider: 'Google', time: '8 minutes ago', status: 'failed' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-sm font-medium">{activity.user}</span>
                        <span className="text-sm text-gray-500">via {activity.provider}</span>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-2 flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading SSO providers...</p>
                  </div>
                </div>
              ) : (
                ssoProviders.map((providerInfo) => (
                  <ProviderCard
                    key={providerInfo.provider}
                    providerInfo={providerInfo}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Organizations & Domains</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SSO Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MFA
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">                      Eylemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizations.map((org) => (
                    <OrganizationRow key={org.id} org={org} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">SSO Audit Logs</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Audit log functionality would be implemented here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}