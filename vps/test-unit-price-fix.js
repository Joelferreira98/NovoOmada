// Teste para verificar se unitPrice está sendo enviado corretamente na VPS

const testUnitPriceData = {
  name: "Teste UnitPrice - VND123456",
  amount: 5,
  codeLength: 8,
  codeForm: [0], // apenas números
  limitType: 1, // Limited Online Users
  limitNum: 1, // 1 usuário simultâneo
  durationType: 0, // Client duration
  duration: 60, // 1 hora
  timingType: 0, // Timing by time
  rateLimit: {
    mode: 0,
    customRateLimit: {
      downLimitEnable: false,
      downLimit: 0,
      upLimitEnable: false,
      upLimit: 0
    }
  },
  trafficLimitEnable: false,
  unitPrice: 15.00, // ✅ TESTE: Preço fixo para verificar
  currency: "BRL", // ✅ TESTE: Moeda
  applyToAllPortals: true,
  portals: [],
  logout: true,
  description: "Teste de Unit Price - VPS",
  printComments: "Teste para verificar se unitPrice está sendo enviado"
};

console.log('=== TESTE UNIT PRICE VPS ===');
console.log('Dados que serão enviados para Omada API:');
console.log(JSON.stringify(testUnitPriceData, null, 2));

console.log('\n=== VERIFICAÇÕES ===');
console.log('✓ unitPrice está presente:', testUnitPriceData.unitPrice);
console.log('✓ unitPrice é número:', typeof testUnitPriceData.unitPrice);
console.log('✓ currency está presente:', testUnitPriceData.currency);

// Simular o que acontece no parseFloat
const planUnitPrice = "15.00"; // Exemplo do banco
const parsedPrice = parseFloat(planUnitPrice || "0") || 0;
console.log('✓ parseFloat("15.00"):', parsedPrice);

console.log('\n=== PROBLEMAS POSSÍVEIS ===');
console.log('1. Verificar se plan.unitPrice não está undefined/null no banco');
console.log('2. Verificar se Omada API está recebendo o campo unitPrice');
console.log('3. Verificar se controlador Omada suporta unitPrice na versão atual');
console.log('4. Verificar logs do servidor durante criação de voucher');

console.log('\n=== PRÓXIMOS PASSOS ===');
console.log('1. Criar voucher via interface e verificar logs do servidor');
console.log('2. Verificar no controlador Omada se voucher foi criado com preço');
console.log('3. Se não aparecer, verificar documentação da API Omada');