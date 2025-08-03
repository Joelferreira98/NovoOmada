import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import StatsCard from '@/components/layout/StatsCard';
import DataTable from '@/components/layout/DataTable';
import { 
  MdPrint,
  MdCreditCard, 
  MdTrendingUp,
  MdPeople,
  MdAdd,
  MdRefresh
} from 'react-icons/md';
import { FaTicketAlt, FaChartLine } from 'react-icons/fa';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ModernAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Queries
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/plans']
  });

  const { data: vouchers, isLoading: vouchersLoading } = useQuery({
    queryKey: ['/api/vouchers']
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales']
  });

  // Mutation para criar vouchers
  const createVouchersMutation = useMutation({
    mutationFn: async (data: { planId: string; quantity: number }) => {
      const response = await apiRequest('POST', '/api/vouchers', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers'] });
      toast({
        title: "Vouchers criados com sucesso!",
        description: `${quantity} voucher(s) criado(s)`,
      });
      setQuantity(1);
      setSelectedPlan('');
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar vouchers",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  });

  // Estatísticas
  const stats = [
    {
      title: 'Vouchers Ativos',
      value: Array.isArray(vouchers) ? vouchers.filter((v: any) => v.status === 'active').length : 0,
      icon: <FaTicketAlt />,
      change: { value: 'Disponíveis', trend: 'up' as const }
    },
    {
      title: 'Vendas Hoje',
      value: Array.isArray(sales) ? sales.filter((s: any) => 
        new Date(s.createdAt).toDateString() === new Date().toDateString()
      ).length : 0,
      icon: <MdCreditCard />,
      change: { value: '+8% vs ontem', trend: 'up' as const }
    },
    {
      title: 'Planos Ativos',
      value: Array.isArray(plans) ? plans.length : 0,
      icon: <MdPeople />,
      change: { value: 'Configurados', trend: 'neutral' as const }
    },
    {
      title: 'Impressões',
      value: '24',
      icon: <MdPrint />,
      change: { value: 'Hoje', trend: 'up' as const }
    }
  ];

  // Colunas da tabela de vouchers
  const voucherColumns = [
    { key: 'code', title: 'Código', render: (value: string) => (
      <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono">{value}</code>
    )},
    { key: 'planName', title: 'Plano' },
    { key: 'status', title: 'Status', render: (value: string) => (
      <div className={`badge ${
        value === 'active' ? 'badge-success' : 
        value === 'used' ? 'badge-warning' : 
        'badge-error'
      }`}>
        {value === 'active' ? 'Ativo' : value === 'used' ? 'Usado' : 'Expirado'}
      </div>
    )},
    { key: 'createdAt', title: 'Criado', render: (value: string) => 
      new Date(value).toLocaleDateString('pt-BR')
    }
  ];

  const handleCreateVouchers = () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Escolha um plano antes de criar vouchers",
        variant: "destructive",
      });
      return;
    }

    createVouchersMutation.mutate({
      planId: selectedPlan,
      quantity: quantity
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Dashboard Admin</h1>
            <p className="text-base-content/70 mt-1">
              Gerencie vouchers e monitore vendas
            </p>
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <button 
              onClick={() => queryClient.invalidateQueries()}
              className="btn btn-outline btn-sm"
            >
              <MdRefresh className="mr-2" />
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Voucher Creation */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-base-content mb-4 flex items-center">
              <MdAdd className="mr-2" />
              Criar Vouchers
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Plano</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  <option value="">Selecione um plano</option>
                  {Array.isArray(plans) && plans.map((plan: any) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nome} - R$ {plan.unitPrice} ({plan.duration}min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Quantidade</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="input input-bordered w-full"
                />
              </div>

              <button
                onClick={handleCreateVouchers}
                disabled={!selectedPlan || createVouchersMutation.isPending}
                className="btn btn-primary w-full"
              >
                {createVouchersMutation.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <MdAdd className="mr-2" />
                    Criar {quantity} Voucher{quantity > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Vouchers */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-base-content">Vouchers Recentes</h2>
              <button className="btn btn-ghost btn-sm">Ver todos</button>
            </div>
            <DataTable
              columns={voucherColumns}
              data={Array.isArray(vouchers) ? vouchers.slice(0, 5) : []}
              loading={vouchersLoading}
            />
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <MdPrint className="text-4xl text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Imprimir Vouchers</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Imprima vouchers em formato A4 ou cupom térmico
            </p>
            <button className="btn btn-outline btn-sm">
              Imprimir Últimos
            </button>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <FaChartLine className="text-4xl text-secondary mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Relatórios</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Visualize estatísticas e relatórios de vendas
            </p>
            <button className="btn btn-outline btn-sm">
              Ver Relatórios
            </button>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <MdCreditCard className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Gestão de Caixa</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Controle entradas e saídas do caixa
            </p>
            <button className="btn btn-outline btn-sm">
              Abrir Caixa
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}