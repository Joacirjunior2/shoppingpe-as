import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

interface Earning {
  id: string;
  cents: number;
  recordedAt: string;
}

const storageKey = 'motoboy-manual-earnings-v1';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isEarning(value: unknown): value is Earning {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Earning>;
  return typeof item.id === 'string'
    && typeof item.cents === 'number'
    && Number.isSafeInteger(item.cents)
    && item.cents > 0
    && typeof item.recordedAt === 'string'
    && Number.isFinite(new Date(item.recordedAt).getTime());
}

export default function MotoboyDailyEarnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [amount, setAmount] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed) || !parsed.every(isEarning)) {
        throw new Error('Invalid earnings');
      }
      setEarnings(parsed);
      setReady(true);
    } catch {
      setError('Não foi possível carregar os ganhos salvos neste navegador. Os registros não foram alterados.');
    }
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const today = earnings.filter(item => dayKey(new Date(item.recordedAt)) === dayKey(now));
  const total = today.reduce((sum, item) => sum + item.cents, 0);

  function save(next: Earning[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setEarnings(next);
      setError('');
      return true;
    } catch {
      setError('Não foi possível salvar a alteração. Verifique se o armazenamento deste navegador está disponível.');
      return false;
    }
  }

  function addEarning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const value = amount.trim();
    if (!/^\d{1,7}([,.]\d{1,2})?$/.test(value)) {
      setError('Informe um valor como 15,50, sem separador de milhar.');
      return;
    }
    const [whole, fraction = ''] = value.replace(',', '.').split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (cents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    const date = new Date();
    setNow(date);
    const entry: Earning = {
      id: `${date.getTime()}-${Math.random().toString(36).slice(2)}`,
      cents,
      recordedAt: date.toISOString(),
    };
    if (save([...earnings, entry])) setAmount('');
  }

  return (
    <section aria-labelledby="daily-earnings-heading" className="space-y-5 rounded-2xl border border-primary/20 bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="daily-earnings-heading" className="text-lg font-semibold">Ganhos de hoje</h2>
          <p className="mt-1 text-sm text-muted-foreground">{now.toLocaleDateString('pt-BR')} · Horário deste dispositivo</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Registro manual</span>
      </div>
      <div aria-live="polite" className="space-y-1">
        <p className="text-4xl font-bold tracking-tight text-primary">{ready ? currency.format(total / 100) : '—'}</p>
        <p className="text-sm text-muted-foreground">{ready ? `${today.length} lançamento(s) de hoje` : 'Total indisponível até carregar os registros'}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">Registre o valor que você ganhou em cada entrega concluída hoje, não o valor da compra. Estes lançamentos ficam apenas neste navegador e não são sincronizados com as entregas.</p>
      <form onSubmit={addEarning} className="space-y-2">
        <label htmlFor="motoboy-earning-amount" className="block text-sm font-medium">Valor recebido (R$)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="motoboy-earning-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="Ex.: 15,50" value={amount} onChange={event => setAmount(event.target.value)} disabled={!ready} required maxLength={10} aria-describedby={error ? 'motoboy-earnings-error' : undefined} className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
          <button type="submit" disabled={!ready} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">Adicionar valor</button>
        </div>
      </form>
      {error && <p id="motoboy-earnings-error" role="alert" className="text-sm text-destructive">{error}</p>}
      {ready && today.length === 0 && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Nenhum valor registrado hoje.</p>}
      {today.length > 0 && (
        <ul aria-label="Valores registrados hoje" className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {[...today].reverse().map(item => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{currency.format(item.cents / 100)}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button type="button" onClick={() => {
                if (window.confirm('Excluir este valor dos ganhos registrados?')) {
                  save(earnings.filter(entry => entry.id !== item.id));
                }
              }} aria-label={`Excluir lançamento de ${currency.format(item.cents / 100)}`} className="min-h-11 rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
