"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { processCheckoutAction, type CheckoutItem } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

type ItemRowProps = {
  item: CheckoutItem;
  onChange: (it: CheckoutItem) => void;
  onRemove: () => void;
};

function ItemRow({ item, onChange, onRemove }: ItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <select
        className="col-span-2 border rounded h-10 px-2 bg-background"
        value={item.category}
        onChange={(e) => onChange({ ...item, category: e.target.value as CheckoutItem['category'] })}
      >
        <option value="flight">Flight</option>
        <option value="hotel">Hotel</option>
        <option value="car">Car</option>
      </select>
      <Input
        className="col-span-6"
        placeholder="Description (e.g., Indigo 6E-123, 10:30 → 13:05)"
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
      />
      <Input
        className="col-span-2"
        type="number"
        min={0}
        step="0.01"
        placeholder="Unit $"
        value={item.unitPriceUsd ?? 0}
        onChange={(e) => onChange({ ...item, unitPriceUsd: Number(e.target.value || 0) })}
      />
      <Input
        className="col-span-1"
        type="number"
        min={1}
        step="1"
        placeholder="Qty"
        value={item.quantity ?? 1}
        onChange={(e) => onChange({ ...item, quantity: Math.max(1, Number(e.target.value || 1)) })}
      />
      <Button className="col-span-1" variant="ghost" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

export type CheckoutSuggestions = {
  flights?: CheckoutItem[];
  hotels?: CheckoutItem[];
  cars?: CheckoutItem[];
};

export function Checkout({ suggestions }: { suggestions?: CheckoutSuggestions }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<CheckoutItem[]>([
    { category: 'flight', description: '', unitPriceUsd: 0, quantity: 1 },
    { category: 'hotel', description: '', unitPriceUsd: 0, quantity: 1 },
    { category: 'car', description: '', unitPriceUsd: 0, quantity: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    paymentId: string;
    status: string;
    charges: { subtotal: number; serviceFee: number; taxes: number; total: number };
    email: { sent: boolean; transport: string; filePath?: string };
  }>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + (it.unitPriceUsd || 0) * Math.max(1, it.quantity || 1), 0);
    const serviceFee = Math.round(subtotal * 0.025 * 100) / 100;
    const taxes = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + serviceFee + taxes) * 100) / 100;
    return { subtotal, serviceFee, taxes, total };
  }, [items]);

  const updateItem = (idx: number, it: CheckoutItem) => {
    setItems((prev) => prev.map((p, i) => (i === idx ? it : p)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems((prev) => [...prev, { category: 'flight', description: '', unitPriceUsd: 0, quantity: 1 }]);

  const ensureCategoryRow = (category: CheckoutItem['category']): number => {
    const idx = items.findIndex((it) => it.category === category);
    if (idx >= 0) return idx;
    setItems((prev) => [{ category, description: '', unitPriceUsd: 0, quantity: 1 }, ...prev]);
    return 0; // will be correct on next render
  };

  const applySuggestion = (category: CheckoutItem['category'], s?: CheckoutItem) => {
    const idx = ensureCategoryRow(category);
    if (!s) return; // user chose Other => do nothing
    const qty = items[idx]?.quantity ?? 1;
    updateItem(idx, { ...s, category, quantity: qty });
  };

  const disabled = !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || items.length === 0;

  const submit = async () => {
    setLoading(true);
    setResult(null);
    const res = await processCheckoutAction({ email, name, items });
    if (res.success && res.data) {
      setResult(res.data);
      toast({ title: 'Payment succeeded', description: `Payment ID ${res.data.paymentId}. Email ${res.data.email.sent ? 'sent' : 'stored'} (${res.data.email.transport}).` });
    } else {
      toast({ variant: 'destructive', title: 'Checkout failed', description: res.error || 'Please try again.' });
    }
    setLoading(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Checkout (Mock Payment)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email for confirmation" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {suggestions && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Quick-pick from suggested options</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Flight</div>
                <select
                  className="w-full border rounded h-10 px-2 bg-background"
                  onChange={(e) => {
                    const v = e.target.value;
                    const idx = Number(v);
                    applySuggestion('flight', Number.isFinite(idx) && suggestions.flights ? suggestions.flights[idx] : undefined);
                  }}
                  defaultValue=""
                >
                  <option value="">Other…</option>
                  {(suggestions.flights || []).map((s, i) => (
                    <option key={i} value={i}>
                      {s.description} — ${s.unitPriceUsd.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Hotel</div>
                <select
                  className="w-full border rounded h-10 px-2 bg-background"
                  onChange={(e) => {
                    const v = e.target.value;
                    const idx = Number(v);
                    applySuggestion('hotel', Number.isFinite(idx) && suggestions.hotels ? suggestions.hotels[idx] : undefined);
                  }}
                  defaultValue=""
                >
                  <option value="">Other…</option>
                  {(suggestions.hotels || []).map((s, i) => (
                    <option key={i} value={i}>
                      {s.description} — ${s.unitPriceUsd.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Car</div>
                <select
                  className="w-full border rounded h-10 px-2 bg-background"
                  onChange={(e) => {
                    const v = e.target.value;
                    const idx = Number(v);
                    applySuggestion('car', Number.isFinite(idx) && suggestions.cars ? suggestions.cars[idx] : undefined);
                  }}
                  defaultValue=""
                >
                  <option value="">Other…</option>
                  {(suggestions.cars || []).map((s, i) => (
                    <option key={i} value={i}>
                      {s.description} — ${s.unitPriceUsd.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((it, idx) => (
            <ItemRow key={idx} item={it} onChange={(v) => updateItem(idx, v)} onRemove={() => removeItem(idx)} />
          ))}
          <div>
            <Button variant="secondary" onClick={addItem}>Add Item</Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Subtotal: ${'{'}totals.subtotal.toFixed(2){'}'} · Service fee (2.5%): ${'{'}totals.serviceFee.toFixed(2){'}'} · Taxes (8%): ${'{'}totals.taxes.toFixed(2){'}'}
          <div className="font-medium text-foreground">Total: ${'{'}totals.total.toFixed(2){'}'}</div>
        </div>

        <div className="flex gap-2">
          <Button disabled={disabled || loading} onClick={submit}>{loading ? 'Processing…' : 'Pay & Email Confirmation'}</Button>
          <div className="text-xs text-muted-foreground self-center">Payment is mocked. Email uses SMTP if configured; else saved to outbox/ as .eml</div>
        </div>

        {result && (
          <div className="text-sm mt-2">
            <div>Payment ID: <code>{result.paymentId}</code></div>
            <div>Status: {result.status}</div>
            <div>Total: ${'{'}result.charges.total.toFixed(2){'}'}</div>
            {result.email.filePath && (
              <div>Dev email saved at: <code>{result.email.filePath}</code></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
