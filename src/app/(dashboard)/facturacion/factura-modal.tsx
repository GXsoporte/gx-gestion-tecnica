'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';

const itemSchema = z.object({
  description: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().positive('Mayor a 0'),
  unitPrice: z.coerce.number().min(0, 'No negativo'),
});

const schema = z.object({
  clientId: z.string().min(1, 'Cliente requerido'),
  dueDate: z.string().min(1, 'Requerido'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().default('COP'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agrega al menos un ítem'),
});

type FormData = z.infer<typeof schema>;

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(n);
}

// Default due date: 30 days from today
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export function FacturaModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!invoice;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clientes');
      return data.data;
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: invoice
      ? {
          clientId: invoice.clientId,
          dueDate: invoice.dueDate?.split('T')[0],
          taxRate: invoice.taxRate,
          currency: invoice.currency,
          notes: invoice.notes || '',
          terms: invoice.terms || '',
          items: invoice.items?.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })) || [{ description: '', quantity: 1, unitPrice: 0 }],
        }
      : {
          dueDate: defaultDueDate(),
          taxRate: 0,
          currency: 'COP',
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const taxRate = watch('taxRate') || 0;

  const subtotal = (watchedItems || []).reduce(
    (s, item) => s + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        taxRate: Number(data.taxRate),
        items: data.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };

      if (isEdit) {
        await axios.patch(`/api/facturacion/${invoice.id}`, payload);
      } else {
        await axios.post('/api/facturacion', payload);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar factura');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold">{isEdit ? 'Editar Factura' : 'Nueva Factura'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Cliente + Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select
                {...register('clientId')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Moneda</label>
              <select
                {...register('currency')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="COP">COP — Peso colombiano</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">IVA (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate')}
                placeholder="19"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Fecha de vencimiento *</label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.dueDate && <p className="text-destructive text-xs mt-1">{errors.dueDate.message}</p>}
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label">Ítems *</label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar ítem
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_110px_36px] gap-0 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Descripción</span>
                <span className="text-center">Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span />
              </div>

              {fields.map((field, index) => {
                const qty = Number(watchedItems?.[index]?.quantity) || 0;
                const price = Number(watchedItems?.[index]?.unitPrice) || 0;
                const lineTotal = qty * price;

                return (
                  <div key={field.id} className="grid grid-cols-[1fr_80px_110px_36px] gap-0 border-t border-border/50 items-center px-3 py-2">
                    <div className="pr-2">
                      <input
                        {...register(`items.${index}.description`)}
                        placeholder="Descripción del servicio"
                        className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-destructive text-xs">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>
                    <div className="px-1">
                      <input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full text-sm text-center bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="px-1 text-right">
                      <input
                        {...register(`items.${index}.unitPrice`)}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full text-sm text-right bg-transparent focus:outline-none"
                      />
                      {lineTotal > 0 && (
                        <p className="text-xs text-muted-foreground">{fmt(lineTotal)}</p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Totales */}
              <div className="border-t border-border bg-muted/10 px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA ({taxRate}%)</span>
                  <span className="font-medium text-foreground">{fmt(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
            </div>
            {errors.items?.root && (
              <p className="text-destructive text-xs mt-1">{errors.items.root.message}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="form-label mb-1.5 block">Notas</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Notas adicionales para el cliente..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div>
            <label className="form-label mb-1.5 block">Términos y condiciones</label>
            <textarea
              {...register('terms')}
              rows={2}
              placeholder="Condiciones de pago, políticas, etc..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar factura' : 'Crear factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
