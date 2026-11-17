import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Loja {
  id: string;
  nome: string;
}

interface StoreDirectoryProps {
  client: SupabaseClient;
}

export default function StoreDirectory({ client }: StoreDirectoryProps) {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const requestVersion = useRef(0);

  const carregar = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await client
        .from('lojas')
        .select('id, nome')
        .order('nome', { ascending: true });
      if (queryError) throw queryError;
      if (version === requestVersion.current) setLojas((data ?? []) as Loja[]);
    } catch {
      if (version === requestVersion.current) {
        setError('Não foi possível carregar as lojas. Tente atualizar a lista novamente.');
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    setLojas([]);
    void carregar();
    return () => { requestVersion.current += 1; };
  }, [carregar]);

  const term = search.trim().toLocaleLowerCase('pt-BR');
  const visible = lojas.filter(loja => loja.nome.toLocaleLowerCase('pt-BR').includes(term));

  return (
    <section aria-labelledby="stores-heading" className="space-y-4 text-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="stores-heading" className="text-2xl font-semibold">Lojas de peças automotivas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Explore as lojas cadastradas, em ordem alfabética.</p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Carregando lojas…' : 'Atualizar lojas'}
        </button>
      </div>

      <label className="block max-w-md text-sm font-medium">
        Buscar loja por nome
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Digite o nome da loja"
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {loading ? (
        <div role="status" className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Carregando lojas…</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">{error}</div>
      ) : visible.length === 0 ? (
        <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <h3 className="font-semibold">{lojas.length ? 'Nenhuma loja encontrada' : 'Nenhuma loja cadastrada'}</h3>
          <p className="text-sm text-muted-foreground">{lojas.length ? 'Tente buscar por outro nome.' : 'As lojas aparecerão aqui assim que forem cadastradas.'}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(loja => (
            <li key={loja.id} className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
              <h3 className="break-words text-lg font-semibold">{loja.nome}</h3>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
