import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import StatsCard from '@/components/layout/StatsCard';
import DataTable from '@/components/layout/DataTable';
import { 
  MdWifi, 
  MdPeople, 
  MdCreditCard, 
  MdTrendingUp,
  MdSettings,
  MdSync,
  MdBusiness
} from 'react-icons/md';
import { FaServer, FaUsers } from 'react-icons/fa';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

export default function ModernMasterDashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Buscar dados do dashboard
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['/api/sites']
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users']
  });

  const { data: credentials } = useQuery({
    queryKey: ['/api/omada-credentials']
  });

  // Redirecionar para login se não autenticado
  if (!user) {
    navigate('/auth');
    return <div>Redirecionando...</div>;
  }

  // Estatísticas
  const stats = [
    {
      title: 'Total de Sites',
      value: Array.isArray(sites) ? sites.length : 0,
      icon: <MdBusiness />,
      change: { value: '+12% este mês', trend: 'up' as const }
    },
    {
      title: 'Usuários Ativos',
      value: Array.isArray(users) ? users.length : 0,
      icon: <FaUsers />,
      change: { value: '+5% esta semana', trend: 'up' as const }
    },
    {
      title: 'Credenciais',
      value: credentials ? 'Configuradas' : 'Pendentes',
      icon: <FaServer />,
      change: { 
        value: credentials ? 'Conectado' : 'Desconectado', 
        trend: credentials ? 'up' as const : 'down' as const 
      }
    },
    {
      title: 'Sistema',
      value: 'Online',
      icon: <MdTrendingUp />,
      change: { value: '99.9% uptime', trend: 'up' as const }
    }
  ];

  // Colunas da tabela de sites
  const siteColumns = [
    { key: 'name', title: 'Nome do Site' },
    { key: 'status', title: 'Status', render: (value: string) => (
      <div className={`badge ${value === 'active' ? 'badge-success' : 'badge-error'}`}>
        {value === 'active' ? 'Ativo' : 'Inativo'}
      </div>
    )},
    { key: 'omadaSiteId', title: 'Omada ID', render: (value: string) => (
      <code className="text-xs bg-base-200 px-2 py-1 rounded">{value || 'N/A'}</code>
    )}
  ];

  // Colunas da tabela de usuários
  const userColumns = [
    { key: 'username', title: 'Usuário' },
    { key: 'role', title: 'Função', render: (value: string) => (
      <div className={`badge ${
        value === 'master' ? 'badge-primary' : 
        value === 'admin' ? 'badge-secondary' : 
        'badge-accent'
      }`}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </div>
    )},
    { key: 'createdAt', title: 'Criado em', render: (value: string) => 
      value ? new Date(value).toLocaleDateString('pt-BR') : 'N/A'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Dashboard Master</h1>
            <p className="text-base-content/70 mt-1">
              Bem-vindo de volta, {user.username}! Gerencie seu sistema Omada.
            </p>
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <button 
              onClick={() => navigate('/diagnostics')}
              className="btn btn-outline btn-sm"
            >
              <MdSettings className="mr-2" />
              Diagnóstico
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-sm"
            >
              <MdSync className="mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
            />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Sites Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-base-content">Sites Cadastrados</h2>
              <button 
                onClick={() => navigate('/master')} 
                className="btn btn-ghost btn-sm"
              >
                Ver todos
              </button>
            </div>
            <DataTable
              columns={siteColumns}
              data={Array.isArray(sites) ? sites : []}
              loading={sitesLoading}
            />
          </div>

          {/* Users Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-base-content">Usuários do Sistema</h2>
              <button 
                onClick={() => navigate('/master')} 
                className="btn btn-ghost btn-sm"
              >
                Gerenciar
              </button>
            </div>
            <DataTable
              columns={userColumns}
              data={Array.isArray(users) ? users : []}
              loading={usersLoading}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-base-100 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-base-content mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/diagnostics')}
              className="btn btn-outline btn-lg"
            >
              <MdSettings className="mr-2" />
              Configurar Credenciais
            </button>
            <button 
              onClick={() => navigate('/master')}
              className="btn btn-outline btn-lg"
            >
              <MdSync className="mr-2" />
              Sincronizar Sites
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="btn btn-outline btn-lg"
            >
              <MdTrendingUp className="mr-2" />
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}