const BASE = 'http://localhost:3333';
const ORG = '00000000-0000-0000-0000-000000000001';
const USR = '00000000-0000-0000-0000-000000000002';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`POST ${path}:`, res.status, JSON.stringify(data).slice(0, 80));
  return data;
}

async function seed() {
  console.log('Iniciando seed...\n');

  // Pedidos
  for (let i = 1; i <= 5; i++) {
    await post('/pedidos', {
      idOrganizacao: ORG,
      idCentroCusto: '00000000-0000-0000-0000-000000000010',
      criadoPor: USR,
      justificativa: `Pedido de teste ${i}`,
      itens: [],
    });
  }

  // Cotações
  for (let i = 1; i <= 3; i++) {
    await post('/cotacoes', {
      idOrganizacao: ORG,
      titulo: `Cotacao teste ${i}`,
      descricao: `Descricao cotacao ${i}`,
      dataLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      criadoPor: USR,
      itens: [],
    });
  }

  console.log('\nSeed concluido!');
}

seed().catch(console.error);