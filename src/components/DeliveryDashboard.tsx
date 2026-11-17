import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDeliveryService } from '../lib/delivery-service';
import type { Entrega, Entregador } from '../lib/delivery-service';

interface DeliveryDashboardProps {
  client: SupabaseClient;
}

const inputClass = 'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const buttonClass = 'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const labelClass = 'block text-sm font-medium text-foreground';
const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_rota: 'Em rota',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function formText(form: HTMLFormElement, field: string) {
  return String(new FormData(form).get(field) ?? '').trim();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR');
}

export default function DeliveryDashboard({ client }: DeliveryDashboardProps) {
  const service = useMemo(() => createDeliveryService(client), [client]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const operation = useRef(false);
  const requestVersion = useRef(0);

  const carregar = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const data = await service.listar();
      if (version !== requestVersion.current) return;
      setEntregadores(data.entregadores);
      setEntregas(data.entregas);
      setLoaded(true);
    } catch (cause) {
      if (version === requestVersion.current) setError(errorMessage(cause));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    setLoaded(false);
    setEntregadores([]);
    setEntregas([]);
    void carregar();
    return () => { requestVersion.current += 1; };
  }, [carregar]);

  async function executar(task: () => Promise<void>, message: string) {
    if (operation.current || loading || !loaded) return;
    operation.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await task();
      setNotice(message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function cadastrarEntregador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const nome = formText(form, 'nome');
    const tipo_veiculo = formText(form, 'tipo_veiculo');
    if (!nome || !tipo_veiculo) {
      setError('Preencha o nome e o tipo de veículo.');
      return;
    }
    await executar(async () => {
      const novo = await service.criarEntregador({
        nome, tipo_veiculo, telefone: formText(form, 'telefone') || null,
      });
      setEntregadores(current => [...current, novo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      form.reset();
    }, 'Entregador cadastrado.');
  }

  async function cadastrarEntrega(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const dados = {
      origem_site: formText(form, 'origem_site'),
      referencia_pedido: formText(form, 'referencia_pedido'),
      endereco_coleta: formText(form, 'endereco_coleta'),
      endereco_destino: formText(form, 'endereco_destino'),
      entregador_id: formText(form, 'entregador_id') || null,
    };
    if (!dados.origem_site || !dados.referencia_pedido || !dados.endereco_coleta || !dados.endereco_destino) {
      setError('Preencha a origem, a referência do pedido e os dois endereços.');
      return;
    }
    await executar(async () => {
      const nova = await service.criarEntrega(dados);
      setEntregas(current => [nova, ...current]);
      form.reset();
    }, 'Entrega cadastrada.');
  }

  async function atualizarEntrega(id: string, dados: Partial<Pick<Entrega, 'status' | 'entregador_id'>>) {
    await executar(async () => {
      const atualizada = await service.atualizarEntrega(id, dados);
      setEntregas(current => current.map(item => item.id === id ? atualizada : item));
    }, 'Entrega atualizada.');
  }

  const disabled = loading || saving || !loaded;
  const statusOptions = Array.from(new Set([...Object.keys(statusLabels), ...entregas.map(item => item.status)]));
  const visible = entregas.filter(item => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const driver = entregadores.find(candidate => candidate.id === item.entregador_id);
    return (!statusFilter || item.status === statusFilter) &&
      [item.referencia_pedido, item.origem_site, item.endereco_coleta, item.endereco_destino, driver?.nome ?? '']
        .some(value => value.toLocaleLowerCase('pt-BR').includes(term));
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Shoppingpe-as</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Central de entregas</h1>
            <p className="mt-2 text-sm text-muted-foreground">Organize os pedidos e conecte cada entrega ao seu entregador.</p>
          </div>
          <button type="button" className={buttonClass} disabled={loading || saving} onClick={() => { setNotice(''); void carregar(); }}>
            {loading ? 'Carregando…' : 'Atualizar dados'}
          </button>
        </header>

        {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">{notice}</div>}

        <section aria-label="Resumo das operações" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total de entregas', value: entregas.length },
            { label: 'Pendentes', value: entregas.filter(item => item.status === 'pendente').length },
            { label: 'Entregues', value: entregas.filter(item => item.status === 'entregue').length },
            { label: 'Entregadores', value: entregadores.length },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{loaded ? item.value : '—'}</p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm lg:col-span-2">
            <h2 className="text-xl font-semibold">Nova entrega</h2>
            <p className="mt-1 text-sm text-muted-foreground">O pedido será criado com o status padrão do banco.</p>
            <form className="mt-5" onSubmit={cadastrarEntrega}>
              <fieldset disabled={disabled} className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className={labelClass}>Site de origem<input name="origem_site" required className={inputClass} placeholder="Nome do site ou loja" /></label>
                <label className={labelClass}>Referência do pedido<input name="referencia_pedido" required className={inputClass} placeholder="Código do pedido" /></label>
                <label className={labelClass}>Endereço de coleta<textarea name="endereco_coleta" required rows={2} className={inputClass} placeholder="Rua, número, bairro e cidade" /></label>
                <label className={labelClass}>Endereço de destino<textarea name="endereco_destino" required rows={2} className={inputClass} placeholder="Rua, número, bairro e cidade" /></label>
                <label className={labelClass}>Entregador<select name="entregador_id" className={inputClass} defaultValue="">
                  <option value="">Atribuir depois</option>
                  {entregadores.map(item => <option key={item.id} value={item.id}>{item.nome} · {item.tipo_veiculo}</option>)}
                </select></label>
                <div className="flex items-end"><button type="submit" disabled={disabled} className={`${buttonClass} w-full sm:w-auto`}>{saving ? 'Salvando…' : 'Cadastrar entrega'}</button></div>
              </fieldset>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold">Novo entregador</h2>
            <form className="mt-5" onSubmit={cadastrarEntregador}>
              <fieldset disabled={disabled} className="min-w-0 space-y-4">
                <label className={labelClass}>Nome<input name="nome" required autoComplete="name" className={inputClass} /></label>
                <label className={labelClass}>Telefone <span className="font-normal text-muted-foreground">(opcional)</span><input name="telefone" type="tel" autoComplete="tel" className={inputClass} /></label>
                <label className={labelClass}>Tipo de veículo<input name="tipo_veiculo" required className={inputClass} placeholder="Ex.: moto, carro ou bicicleta" /></label>
                <button type="submit" disabled={disabled} className={`${buttonClass} w-full`}>{saving ? 'Salvando…' : 'Cadastrar entregador'}</button>
              </fieldset>
            </form>
          </section>
        </div>

        <section aria-labelledby="deliveries-heading" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><h2 id="deliveries-heading" className="text-2xl font-semibold">Entregas</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe os pedidos, responsáveis e status.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className={labelClass}>Buscar<input type="search" value={search} onChange={event => setSearch(event.target.value)} className={inputClass} placeholder="Pedido, endereço ou entregador" /></label>
              <label className={labelClass}>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={inputClass}>
                <option value="">Todos</option>
                {statusOptions.map(status => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}
              </select></label>
            </div>
          </div>
          {loading ? (
            <div role="status" className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-card p-6 text-muted-foreground">Carregando entregas…</div>
          ) : !loaded ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-center"><h3 className="font-semibold">Dados indisponíveis</h3><p className="text-sm text-muted-foreground">Use Atualizar dados para tentar novamente.</p></div>
          ) : visible.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-6 text-center"><h3 className="font-semibold">{entregas.length ? 'Nenhuma entrega encontrada' : 'Nenhuma entrega cadastrada'}</h3><p className="text-sm text-muted-foreground">{entregas.length ? 'Ajuste a busca ou o filtro de status.' : 'Cadastre o primeiro pedido no formulário acima.'}</p></div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visible.map(item => (
                <article key={item.id} className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="break-words text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.origem_site}</p><h3 className="mt-1 break-words text-lg font-semibold">Pedido {item.referencia_pedido}</h3></div>
                    <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{statusLabels[item.status] ?? item.status}</span>
                  </div>
                  <dl className="my-5 space-y-3 border-l-2 border-primary/30 pl-4 text-sm">
                    <div><dt className="font-medium text-muted-foreground">Coleta</dt><dd className="mt-1 whitespace-pre-wrap break-words">{item.endereco_coleta}</dd></div>
                    <div><dt className="font-medium text-muted-foreground">Destino</dt><dd className="mt-1 whitespace-pre-wrap break-words">{item.endereco_destino}</dd></div>
                  </dl>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Entregador<select className={inputClass} value={item.entregador_id ?? ''} disabled={disabled} onChange={event => void atualizarEntrega(item.id, { entregador_id: event.target.value || null })}>
                      <option value="">Sem entregador</option>
                      {item.entregador_id && !entregadores.some(driver => driver.id === item.entregador_id) && <option value={item.entregador_id}>Entregador não disponível</option>}
                      {entregadores.map(driver => <option key={driver.id} value={driver.id}>{driver.nome}</option>)}
                    </select></label>
                    <label className={labelClass}>Status<select className={inputClass} value={item.status} disabled={disabled} onChange={event => void atualizarEntrega(item.id, { status: event.target.value })}>
                      {statusOptions.map(status => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}
                    </select></label>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Criada em {formatDate(item.criado_em)} · Atualizada em {formatDate(item.atualizado_em)}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="drivers-heading" className="space-y-4">
          <h2 id="drivers-heading" className="text-2xl font-semibold">Entregadores</h2>
          {!loaded || loading ? <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{loading ? 'Carregando entregadores…' : 'Aguardando a leitura dos dados.'}</p> : entregadores.length === 0 ? <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Cadastre um entregador para começar a distribuir os pedidos.</p> : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entregadores.map(item => (
                <li key={item.id} className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                  <h3 className="break-words font-semibold">{item.nome}</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{item.tipo_veiculo}</p>
                  <p className="mt-3 break-words text-sm">{item.telefone || 'Telefone não informado'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
