'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, Mail, Phone, ShoppingBag, Hash, User as UserIcon, Building2 } from 'lucide-react';

interface ListCliente {
  id: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  total_pedidos: number;
  ultimo_pedido: string;
  numero_cliente?: string;
  indicacao?: string;
  unidade_nome?: string;
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
}

function maskDocumento(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

const MOCK_CLIENTES: ListCliente[] = [
  { id: '1', nome: 'Maria Silva',          documento: '12345678901', email: 'maria@email.com',       telefone: '(11) 99999-0001', total_pedidos: 3,  ultimo_pedido: '04/07/2026', numero_cliente: '0001/26', indicacao: 'João Santos', unidade_nome: 'Matriz São Paulo', tipo_pessoa: 'FISICA' },
  { id: '2', nome: 'João Santos',          documento: '98765432100', email: 'joao@email.com',        telefone: '(11) 99999-0002', total_pedidos: 1,  ultimo_pedido: '04/07/2026', numero_cliente: '0002/26', indicacao: '', unidade_nome: 'Matriz São Paulo', tipo_pessoa: 'FISICA' },
  { id: '3', nome: 'Tech Solutions Ltda',  documento: '11222333000181', email: 'contato@techsol.com',telefone: '(11) 99999-0003', total_pedidos: 12, ultimo_pedido: '03/07/2026', numero_cliente: '0003/26', indicacao: 'Indicação própria', unidade_nome: 'Filial Campinas', tipo_pessoa: 'JURIDICA' },
  { id: '4', nome: 'Ana Oliveira',         documento: '22333444000191', email: 'ana@oliveira.com',    telefone: '(11) 99999-0004', total_pedidos: 5,  ultimo_pedido: '02/07/2026', numero_cliente: '0004/26', indicacao: '', unidade_nome: 'Matriz São Paulo', tipo_pessoa: 'JURIDICA' },
  { id: '5', nome: 'Carlos Pereira',       documento: '33444555000',   email: 'carlos@pereira.com',   telefone: '(11) 99999-0005', total_pedidos: 2,  ultimo_pedido: '30/06/2026', numero_cliente: '0005/26', indicacao: 'Maria Silva', unidade_nome: 'Filial Rio de Janeiro', tipo_pessoa: 'FISICA' },
  { id: '6', nome: 'Beta Construções',     documento: '44555666000111', email: 'beta@construcoes.com',telefone: '(11) 99999-0006', total_pedidos: 8,  ultimo_pedido: '28/06/2026', numero_cliente: '0006/26', indicacao: '', unidade_nome: 'Matriz São Paulo', tipo_pessoa: 'JURIDICA' },
  { id: '7', nome: 'Fernanda Lima',        documento: '55666777000',   email: 'fernanda@lima.com',    telefone: '(11) 99999-0007', total_pedidos: 4,  ultimo_pedido: '27/06/2026', numero_cliente: '0007/26', indicacao: 'Pedro Santos', unidade_nome: 'Filial Belo Horizonte', tipo_pessoa: 'FISICA' },
  { id: '8', nome: 'Delta Tech',           documento: '66777888000122', email: 'delta@tech.com',      telefone: '(11) 99999-0008', total_pedidos: 6,  ultimo_pedido: '25/06/2026', numero_cliente: '0008/26', indicacao: '', unidade_nome: 'Filial Campinas', tipo_pessoa: 'JURIDICA' },
];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ListCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    gsApi.get<ListCliente[]>('/clientes')
      .then(setClientes)
      .catch(() => setClientes(MOCK_CLIENTES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.documento.includes(search) ||
    (c.numero_cliente && c.numero_cliente.includes(search))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Activity size={28} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-400 mt-1">{clientes.length} clientes cadastrados</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou nº cliente..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Indicação</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pedidos</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/gs/clientes/${cliente.id}`}
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                      <Hash size={10} />
                      {cliente.numero_cliente || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                        {cliente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">{cliente.nome}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <UserIcon size={10} />
                          {cliente.tipo_pessoa === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-medium">
                    {maskDocumento(cliente.documento)}
                  </td>
                  <td className="px-5 py-4">
                    {cliente.unidade_nome ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={12} className="text-slate-300" />
                        {cliente.unidade_nome}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {cliente.indicacao || (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-bold text-slate-700">{cliente.total_pedidos}</span>
                    <p className="text-[9px] text-slate-400">pedidos</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={11} className="text-slate-300 shrink-0" />
                        {cliente.email}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={11} className="text-slate-300 shrink-0" />
                        {cliente.telefone}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link
                      href={`/gs/clientes/${cliente.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Detalhes <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <UserIcon size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
