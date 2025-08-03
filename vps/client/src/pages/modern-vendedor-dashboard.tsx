import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import StatsCard from '@/components/layout/StatsCard';
import DataTable from '@/components/layout/DataTable';
import { 
  MdShoppingCart,
  MdCreditCard, 
  MdTrendingUp,
  MdPrint,
  MdAdd,
  MdRefresh
} from 'react-icons/md';
import { FaTicketAlt, FaCashRegister } from 'react-icons/fa';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ModernVendedorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Queries
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/plans']
  });

  const { data: mySales, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/my-sales']
  });

  // Estatísticas do vendedor
  const todaySales = Array.isArray(mySales) ? mySales.filter((s: any) => 
    new Date(s.createdAt).toDateString() === new Date().toDateString()
  ) : [];

  const todayRevenue = todaySales.reduce((sum: number, sale: any) => 
    sum + parseFloat(sale.totalAmount || '0'), 0);

  const stats = [
    {
      title: 'Vendas Hoje',
      value: todaySales.length,
      icon: <MdShoppingCart />,
      change: { value: `R$ ${todayRevenue.toFixed(2)}`, trend: 'up' as const }
    },
    {
      title: 'Meta Diária',
      value: '80%',
      icon: <MdTrendingUp />,
      change: { value: '16 de 20 vendas', trend: 'up' as const }
    },
    {
      title: 'Vouchers Vendidos',
      value: Array.isArray(mySales) ? mySales.reduce((sum: number, sale: any) => 
        sum + (sale.quantity || 0), 0) : 0,
      icon: <FaTicketAlt />,
      change: { value: 'Este mês', trend: 'up' as const }
    },
    {
      title: 'Comissão',
      value: `R$ ${(todayRevenue * 0.1).toFixed(2)}`,
      icon: <FaCashRegister />,
      change: { value: '10% das vendas', trend: 'up' as const }
    }
  ];

  // Mutation para vender vouchers
  const sellVouchersMutation = useMutation({
    mutationFn: async (data: { planId: string; quantity: number }) => {
      const response = await apiRequest('POST', '/api/vouchers/sell', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-sales'] });
      toast({
        title: "Venda realizada com sucesso!",
        description: `${quantity} voucher(s) vendido(s)`,
      });
      setQuantity(1);
      setSelectedPlan('');
    },
    onError: (error) => {
      toast({
        title: "Erro na venda",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  });

  // Colunas da tabela de vendas
  const salesColumns = [
    { key: 'code', title: 'Voucher', render: (value: string) => (
      <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono">{value}</code>
    )},
    { key: 'planName', title: 'Plano' },
    { key: 'quantity', title: 'Qtd.' },
    { key: 'totalAmount', title: 'Valor', render: (value: string) => 
      `R$ ${parseFloat(value || '0').toFixed(2)}`
    },
    { key: 'createdAt', title: 'Data', render: (value: string) => 
      new Date(value).toLocaleDateString('pt-BR')
    }
  ];

  const handleSellVouchers = () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Escolha um plano antes de vender vouchers",
        variant: "destructive",
      });
      return;
    }

    sellVouchersMutation.mutate({
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
            <h1 className="text-2xl font-bold text-base-content">Painel do Vendedor</h1>
            <p className="text-base-content/70 mt-1">
              Olá, {user?.username}! Realize vendas e acompanhe seu desempenho
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
          {/* Sales Form */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-base-content mb-4 flex items-center">
              <MdShoppingCart className="mr-2" />
              Nova Venda
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
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="input input-bordered w-full"
                />
              </div>

              {selectedPlan && (
                <div className="bg-base-200 p-3 rounded">
                  <p className="text-sm text-base-content/70">Total da venda:</p>
                  <p className="text-lg font-semibold text-primary">
                    R$ {(parseFloat(plans?.find((p: any) => p.id === selectedPlan)?.unitPrice || '0') * quantity).toFixed(2)}
                  </p>
                </div>
              )}

              <button
                onClick={handleSellVouchers}
                disabled={!selectedPlan || sellVouchersMutation.isPending}
                className="btn btn-success w-full"
              >
                {sellVouchersMutation.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <MdShoppingCart className="mr-2" />
                    Vender {quantity} Voucher{quantity > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-base-content">Minhas Vendas Recentes</h2>
              <button className="btn btn-ghost btn-sm">Ver todas</button>
            </div>
            <DataTable
              columns={salesColumns}
              data={Array.isArray(mySales) ? mySales.slice(0, 5) : []}
              loading={salesLoading}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <MdPrint className="text-4xl text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Imprimir Vouchers</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Imprima vouchers da última venda
            </p>
            <button className="btn btn-outline btn-sm">
              Última Impressão
            </button>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <MdTrendingUp className="text-4xl text-secondary mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Meus Relatórios</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Veja seu histórico de vendas e comissões
            </p>
            <button className="btn btn-outline btn-sm">
              Ver Histórico
            </button>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-6 text-center">
            <FaCashRegister className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-base-content mb-2">Meta Diária</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Acompanhe seu progresso diário
            </p>
            <div className="progress progress-primary w-full mb-2">
              <div className="progress-bar" style={{width: '80%'}}></div>
            </div>
            <p className="text-sm text-primary font-semibold">16/20 vendas (80%)</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}