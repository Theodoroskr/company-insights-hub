import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Run against the connected backend with a temporary authenticated test session.
const token = process.env.CHECKOUT_TEST_TOKEN;
const url = process.env.CHECKOUT_TEST_URL;
const key = process.env.CHECKOUT_TEST_KEY;
const suite = token && url && key ? describe : describe.skip;

suite('atomic checkout ownership and persistence', () => {
  const client = (auth?: string) => createClient(url ?? '', key ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: auth ? { headers: { Authorization: `Bearer ${auth}` } } : undefined,
  });
  const order = () => ({ id: crypto.randomUUID(), order_ref: 'RLS-CHECKOUT-TEST', status: 'pending', subtotal: 110, total: 110, guest_email: 'checkout-test@example.invalid' });
  const items = () => [{ unit_price: 65, screening_addon: true, screening_price_eur: 45 }, { unit_price: 45 }];

  it('creates guest report lines without exposing the guest parent order', async () => {
    const guest = client();
    const payload = order();
    const result = await guest.rpc('create_checkout_order', { _order: payload, _items: items() });
    expect(result.error).toBeNull();
    expect(result.data).toBe(payload.id);
    const read = await guest.from('orders').select('id').eq('id', payload.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
  });

  it('ignores a supplied alternative owner and assigns both lines to the signed-in user', async () => {
    const signedIn = client(token);
    const { data: user } = await signedIn.auth.getUser(token);
    expect(user.user?.id).toBeTruthy();
    const payload = { ...order(), user_id: crypto.randomUUID() };
    const result = await signedIn.rpc('create_checkout_order', { _order: payload, _items: items() });
    expect(result.error).toBeNull();
    const read = await signedIn.from('orders').select('user_id,order_items(id,screening_addon)').eq('id', payload.id).single();
    expect(read.error).toBeNull();
    expect(read.data?.user_id).toBe(user.user?.id);
    expect(read.data?.order_items).toHaveLength(2);
  });

  it('rolls back the parent and every line when a line cannot be saved', async () => {
    const signedIn = client(token);
    const payload = order();
    const result = await signedIn.rpc('create_checkout_order', { _order: payload, _items: [...items(), { unit_price: 10, product_id: crypto.randomUUID() }] });
    expect(result.error).not.toBeNull();
    const read = await signedIn.from('orders').select('id').eq('id', payload.id);
    expect(read.data).toEqual([]);
  });

  it('rejects invalid bearer credentials rather than treating them as a guest', async () => {
    const result = await client('invalid-session').rpc('create_checkout_order', { _order: order(), _items: items() });
    expect(result.error).not.toBeNull();
  });
});