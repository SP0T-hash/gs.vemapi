'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsApi } from '@/lib/gs/auth';
import { Activity, Plus, Search, ArrowUpRight, Mail, Phone, ShoppingBag } from 'lucide-react';

interface ListCliente {
  id: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  total_pedidos: number;
  ultimo_pedido: string;
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
  { id: '1', nome: 'Maria Silva',          documento: '12345678901', email: 'maria@email.com',       telefone: '(11) 99999-0001', total_pedidos: 3,  ultimo_pedido: '04/07/2026' },
  { id: '2', nome: 'João Santos',          documento: '98765432100', email: 'joao@email.com',        telefone: '(11) 99999-0002', total_pedidos: 1,  ultimo_pedido: '04/07/2026' },
  { id: '3', nome: 'Tech Solutions Ltda',  documento: '11222333000181', email: 'contato@techsol.com',telefone: '(11) 99999-0003', total_pedidos: 12, ultimo_pedido: '03/07/2026' },
  { id: '4', nome: 'Ana Oliveira',         documento: '22333444000191', email: 'ana@oliveira.com',    telefone: '(11) 99999-0004', total_pedidos: 5,  ultimo_pedido: '02/07/2026' },
  { id: '5', nome: 'Carlos Pereira',       documento: '33444555000',   email: 'carlos@pereira.com',   telefone: '(11) 99999-0005', total_pedidos: 2,  ultimo_pedido: '30/06/2026' },
  { id: '6', nome: 'Beta Construções',     documento: '44555666000111', email: 'beta@construcoes.com',telefone: '(11) 99999-0006', total_pedidos: 8,  ultimo_pedido: '28/06/2026' },
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
    c.documento.includes(search)
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
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clientes</h1>
        <p className="text-sm text-slate-400 mt-1">{clientes.length} clientes cadastrados</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CPF/CNPJ..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cliente) => (
          <Link
            key={cliente.id}
            href={`/gs/clientes/${cliente.id}`}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>

            <h3 className="text-sm font-bold text-slate-800 mb-1">{cliente.nome}</h3>
            <p className="text-xs text-slate-400 mb-3">{maskDocumento(cliente.documento)}</p>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Mail size={13} className="text-slate-300" />
                {cliente.email}
              </div>
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-slate-300" />
                {cliente.telefone}
              </div>
              <div className="flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-slate-300" />
                {cliente.total_pedidos} pedidos • Último: {cliente.ultimo_pedido}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
        </div>
      )}
    </div>
  );
}
