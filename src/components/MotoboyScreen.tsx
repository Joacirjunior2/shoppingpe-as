import { useState } from 'react';
import MotoboyDailyEarnings from './MotoboyDailyEarnings';

interface MotoboyScreenProps {
  onBack?: () => void;
}

const tabs = [
  { id: 'pendentes', label: 'A coletar', title: 'Nenhuma coleta por enquanto', description: 'As entregas atribuídas a você aparecerão aqui com os endereços de coleta e destino.' },
  { id: 'em_rota', label: 'Em rota', title: 'Nenhuma entrega em andamento', description: 'Acompanhe aqui os pedidos após iniciar uma entrega.' },
  { id: 'entregues', label: 'Concluídas', title: 'Seu histórico começa aqui', description: 'As entregas finalizadas aparecerão nesta área.' },
] as const;

type TabId = typeof tabs[number]['id'];

export default function MotoboyScreen({ onBack }: MotoboyScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>('pendentes');
  const currentTab = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Shoppingpe-as</p>
            {onBack && (
              <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Voltar ao painel
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <circle cx="5" cy="17" r="3" />
                <circle cx="19" cy="17" r="3" />
                <path d="M5 17l4-8h5l5 8M8 11h8M14 5h3l2 12M5 17h8l3-6M7 8h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Área do motoboy</h1>
              <p className="mt-1 text-sm text-muted-foreground">Suas coletas e entregas em um só lugar.</p>
            </div>
          </div>
        </header>

        <section aria-labelledby="connection-heading" className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="connection-heading" className="font-semibold">Pronto para acompanhar suas entregas</h2>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">Sem sincronização</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Esta tela ainda não está conectada às suas entregas. Nenhum pedido está sendo recebido ou atualizado por aqui.</p>
        </section>

        <MotoboyDailyEarnings />

        <section aria-label="Resumo das entregas" className="grid grid-cols-3 gap-2 sm:gap-4">
          {tabs.map(tab => (
            <div key={tab.id} className="rounded-xl border border-border bg-card px-3 py-4 text-card-foreground shadow-sm sm:p-5">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">{tab.label}</p>
              <p aria-label="Sem dados sincronizados" className="mt-2 text-3xl font-bold">—</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="my-deliveries-heading" className="space-y-4">
          <div>
            <h2 id="my-deliveries-heading" className="text-xl font-semibold">Minhas entregas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe cada etapa do seu percurso.</p>
          </div>
          <div role="group" aria-label="Filtrar entregas por etapa" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {tabs.map(tab => (
              <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} aria-controls="motoboy-deliveries" onClick={() => setActiveTab(tab.id)} className={`min-h-12 rounded-lg px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div id="motoboy-deliveries" aria-live="polite" className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-card-foreground">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <path d="M12 3l9 5v9l-9 5-9-5V8l9-5zM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">{currentTab.title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{currentTab.description}</p>
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-card p-5 text-card-foreground">
          <h2 className="text-sm font-semibold">Segurança em primeiro lugar</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Pare em um local seguro antes de consultar pedidos ou atualizar uma entrega. Não utilize o celular enquanto pilota.</p>
        </aside>
      </div>
    </main>
  );
}
