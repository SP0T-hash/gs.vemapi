import { NextRequest, NextResponse } from 'next/server';
import type { GS_ClienteCompleto } from '@/types/gs/agenda';

const mockClientes: GS_ClienteCompleto[] = [
  {
    id: 'cli-001', ar_id: 'ar-001', unidade_id: 'unid-001',
    numero_cliente: 'CLI-0001', indicacao: null,
    nome: 'Maria Silva', cpf_cnpj: '123.456.789-00', email: 'maria@email.com',
    telefone: '(11) 99999-0001', tipo_pessoa: 'FISICA',
    endereco: { cep: '01001-000', logradouro: 'Rua Augusta', numero: '100', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' },
    contador_id: null, observacoes: 'Cliente preferencial',
    unidade_nome: 'Matriz VEMAPI', total_pedidos: 3, ultimo_pedido: '2026-07-01', ultimo_atendimento: '2026-07-05',
  },
  {
    id: 'cli-002', ar_id: 'ar-001', unidade_id: 'unid-001',
    numero_cliente: 'CLI-0002', indicacao: null,
    nome: 'TechSolutions Ltda', cpf_cnpj: '00.000.000/0001-00', email: 'financeiro@techsolutions.com.br',
    telefone: '(11) 3000-0000', tipo_pessoa: 'JURIDICA',
    endereco: { cep: '02002-000', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
    contador_id: 'cont-001', observacoes: null,
    unidade_nome: 'Matriz VEMAPI', total_pedidos: 5, ultimo_pedido: '2026-06-28', ultimo_atendimento: '2026-07-04',
  },
  {
    id: 'cli-003', ar_id: 'ar-001', unidade_id: null,
    numero_cliente: 'CLI-0003', indicacao: 'Indicação do Pedro',
    nome: 'João Santos', cpf_cnpj: '987.654.321-00', email: 'joao@email.com',
    telefone: '(11) 98888-0002', tipo_pessoa: 'FISICA',
    endereco: null, contador_id: null, observacoes: null,
    total_pedidos: 1, ultimo_pedido: '2026-06-15', ultimo_atendimento: '2026-07-05',
  },
  {
    id: 'cli-004', ar_id: 'ar-001', unidade_id: 'unid-002',
    numero_cliente: 'CLI-0004', indicacao: null,
    nome: 'Construtora Nova Era', cpf_cnpj: '11.111.111/0001-11', email: 'adm@novaera.eng.br',
    telefone: '(11) 4000-0000', tipo_pessoa: 'JURIDICA',
    endereco: { cep: '03003-000', logradouro: 'Rua da Consolação', numero: '500', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP' },
    contador_id: 'cont-001', observacoes: 'Cliente corporativo com múltiplos CNPJs',
    unidade_nome: 'Filial Zona Sul', total_pedidos: 8, ultimo_pedido: '2026-07-02', ultimo_atendimento: '2026-06-30',
  },
];

let clientesDb = [...mockClientes];

function findCliente(id: string): GS_ClienteCompleto | undefined {
  return clientesDb.find(c => c.id === id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cliente = findCliente(id);

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ cliente });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cliente = findCliente(id);

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (body.indicacao !== undefined) cliente.indicacao = body.indicacao as string | null;
  if (body.unidade_id !== undefined) cliente.unidade_id = body.unidade_id as string | null;
  if (body.contador_id !== undefined) cliente.contador_id = body.contador_id as string | null;
  if (body.observacoes !== undefined) cliente.observacoes = body.observacoes as string | null;
  if (body.telefone !== undefined) cliente.telefone = body.telefone as string | null;
  if (body.email !== undefined) cliente.email = body.email as string;
  if (body.endereco !== undefined) cliente.endereco = body.endereco as Record<string, unknown> | null;

  const index = clientesDb.findIndex(c => c.id === id);
  if (index !== -1) clientesDb[index] = cliente;

  return NextResponse.json({ success: true, cliente });
}
