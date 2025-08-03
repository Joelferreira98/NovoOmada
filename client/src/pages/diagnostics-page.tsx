import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function DiagnosticsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);

  // Buscar credenciais
  const { data: credentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['/api/omada-credentials'],
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Testar credenciais
  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/omada-credentials/test');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Teste bem-sucedido" : "Teste falhou",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  });

  // Limpar cache de tokens
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/omada-credentials/clear-cache');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cache limpo",
        description: data.message,
        variant: "default",
      });
    }
  });

  const handleTestCredentials = () => {
    setIsTestingCredentials(true);
    testCredentialsMutation.mutate();
    setTimeout(() => setIsTestingCredentials(false), 2000);
  };

  return (
    <div className="container-fluid px-0">
      <div className="row">
        <div className="col-12">
          <div className="mb-4">
            <h1 className="h2 h1-lg fw-bold text-dark mb-2">Diagnóstico do Sistema</h1>
            <p className="text-muted">Verificar status das credenciais Omada e conectividade</p>
          </div>

          {/* Status das Credenciais */}
          <div className="row">
            <div className="col-12 col-lg-8">
              <div className="card shadow-lg border-0 mb-4">
                <div className="card-header bg-white border-bottom">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Settings className="me-2" size={20} />
                    Status das Credenciais Omada
                  </h5>
                </div>
                <div className="card-body">
                  {credentialsLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="animate-spin" size={24} />
                      <p className="mt-2 text-muted">Carregando informações...</p>
                    </div>
                  ) : credentials ? (
                    <div>
                      <div className="row mb-3">
                        <div className="col-sm-4 fw-semibold">URL Omada:</div>
                        <div className="col-sm-8">
                          <code className="bg-light px-2 py-1 rounded">{(credentials as any).omadaUrl}</code>
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-sm-4 fw-semibold">Omada ID:</div>
                        <div className="col-sm-8">
                          <code className="bg-light px-2 py-1 rounded">{(credentials as any).omadacId}</code>
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-sm-4 fw-semibold">Client ID:</div>
                        <div className="col-sm-8">
                          <code className="bg-light px-2 py-1 rounded">{(credentials as any).clientId}</code>
                        </div>
                      </div>
                      <div className="row mb-4">
                        <div className="col-sm-4 fw-semibold">Client Secret:</div>
                        <div className="col-sm-8">
                          <code className="bg-light px-2 py-1 rounded">{'*'.repeat(20)}</code>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-primary d-flex align-items-center"
                          onClick={handleTestCredentials}
                          disabled={isTestingCredentials || testCredentialsMutation.isPending}
                        >
                          {(isTestingCredentials || testCredentialsMutation.isPending) ? (
                            <RefreshCw className="me-2 animate-spin" size={16} />
                          ) : (
                            <CheckCircle className="me-2" size={16} />
                          )}
                          Testar Credenciais
                        </button>

                        <button
                          className="btn btn-outline-secondary d-flex align-items-center"
                          onClick={() => clearCacheMutation.mutate()}
                          disabled={clearCacheMutation.isPending}
                        >
                          {clearCacheMutation.isPending ? (
                            <RefreshCw className="me-2 animate-spin" size={16} />
                          ) : (
                            <RefreshCw className="me-2" size={16} />
                          )}
                          Limpar Cache
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning d-flex align-items-center">
                      <AlertCircle className="me-2" size={20} />
                      <div>
                        <strong>Credenciais não configuradas</strong>
                        <p className="mb-0 mt-1">Configure as credenciais Omada no painel Master primeiro.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="col-12 col-lg-4">
              <div className="card shadow-lg border-0">
                <div className="card-header bg-white border-bottom">
                  <h5 className="card-title mb-0">Solução de Problemas</h5>
                </div>
                <div className="card-body">
                  <div className="alert alert-info">
                    <h6 className="alert-heading">Erro -44116?</h6>
                    <p className="mb-2">Este erro indica credenciais inválidas. Verifique:</p>
                    <ul className="mb-0">
                      <li>Client ID está correto</li>
                      <li>Client Secret está correto</li>
                      <li>Omada ID está correto</li>
                      <li>URL do controlador está acessível</li>
                    </ul>
                  </div>

                  <div className="alert alert-success">
                    <h6 className="alert-heading">Sincronização Automática</h6>
                    <p className="mb-0">
                      O sistema sincroniza vouchers automaticamente a cada 5 minutos. 
                      Se houver erros, eles cessarão após corrigir as credenciais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}