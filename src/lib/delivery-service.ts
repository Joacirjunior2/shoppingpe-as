import type { SupabaseClient } from '@supabase/supabase-js';

export interface Entregador {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_veiculo: string;
}

export interface Entrega {
  id: string;
  origem_site: string;
  referencia_pedido: string;
  endereco_coleta: string;
  endereco_destino: string;
  entregador_id: string | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

export type NovoEntregador = Omit<Entregador, 'id'>;
export type NovaEntrega = Pick<Entrega,
  'origem_site' | 'referencia_pedido' | 'endereco_coleta' | 'endereco_destino' | 'entregador_id'
>;

const camposEntrega = 'id, origem_site, referencia_pedido, endereco_coleta, endereco_destino, entregador_id, status, criado_em, atualizado_em';

export function createDeliveryService(client: SupabaseClient) {
  return {
    async listar() {
      const [entregadores, entregas] = await Promise.all([
        client.from('entregadores').select('id, nome, telefone, tipo_veiculo').order('nome'),
        client.from('entregas').select(camposEntrega).order('criado_em', { ascending: false }),
      ]);
      if (entregadores.error) throw entregadores.error;
      if (entregas.error) throw entregas.error;
      return {
        entregadores: (entregadores.data ?? []) as Entregador[],
        entregas: (entregas.data ?? []) as Entrega[],
      };
    },
    async criarEntregador(dados: NovoEntregador) {
      const { data, error } = await client.from('entregadores').insert(dados)
        .select('id, nome, telefone, tipo_veiculo').single();
      if (error) throw error;
      return data as Entregador;
    },
    async criarEntrega(dados: NovaEntrega) {
      const { data, error } = await client.from('entregas').insert(dados)
        .select(camposEntrega).single();
      if (error) throw error;
      return data as Entrega;
    },
    async atualizarEntrega(id: string, dados: Partial<Pick<Entrega, 'entregador_id' | 'status'>>) {
      const { data, error } = await client.from('entregas')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id).select(camposEntrega).single();
      if (error) throw error;
      return data as Entrega;
    },
  };
}
