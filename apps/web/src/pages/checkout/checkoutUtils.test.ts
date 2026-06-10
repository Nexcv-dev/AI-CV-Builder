import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlanFromQuery } from './checkoutPlans';
import { formatCents, submitPayHereForm } from './checkoutUtils';

describe('checkout utilities', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('formats cents with currency-specific fraction digits', () => {
    expect(formatCents(250000, 'LKR')).toBe('LKR 2,500');
    expect(formatCents(999, 'USD')).toBe('USD 9.99');
  });

  it('defaults unknown checkout plan query values to payg', () => {
    expect(getPlanFromQuery('monthly')).toBe('monthly');
    expect(getPlanFromQuery('quarterly')).toBe('quarterly');
    expect(getPlanFromQuery('enterprise')).toBe('payg');
    expect(getPlanFromQuery(null)).toBe('payg');
  });

  it('builds and submits a hidden PayHere POST form', () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => undefined);

    submitPayHereForm('https://sandbox.payhere.lk/pay/checkout', {
      merchant_id: '123456',
      order_id: 'order_1',
      amount: '2500.00',
    });

    const form = document.body.querySelector('form');
    expect(form).toBeInstanceOf(HTMLFormElement);
    expect(form?.method).toBe('post');
    expect(form?.action).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(form?.style.display).toBe('none');
    expect(Array.from(form?.querySelectorAll('input') || []).map((input) => ({
      type: input.type,
      name: input.name,
      value: input.value,
    }))).toEqual([
      { type: 'hidden', name: 'merchant_id', value: '123456' },
      { type: 'hidden', name: 'order_id', value: 'order_1' },
      { type: 'hidden', name: 'amount', value: '2500.00' },
    ]);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
