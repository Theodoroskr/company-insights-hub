import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
    const v1 = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !v1) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature_bytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const computed = Array.from(new Uint8Array(signature_bytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === v1;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') ?? '';

    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Stripe signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    console.log(`Stripe webhook received: ${event.type}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const paymentIntentId: string = pi.id;

      // Find order by stripe_payment_intent_id
      const { data: order } = await supabase
        .from('orders')
        .select('id, status')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (!order) {
        console.error(`No order found for payment_intent: ${paymentIntentId}`);
        return new Response(JSON.stringify({ received: true, warning: 'Order not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      // ── Instant UK Company Report fulfilment ────────────────
      // Pick up any items in this order whose product is the UK
      // Companies House product (no API4ALL involvement) and fulfil
      // them straight away.
      const { data: ukItems } = await supabase
        .from('order_items')
        .select('id, products:product_id(slug)')
        .eq('order_id', order.id);

      const ukReportItemIds = (ukItems ?? [])
        .filter((it) => (it.products as unknown as { slug?: string } | null)?.slug === 'uk-company-report')
        .map((it) => it.id);

      if (ukReportItemIds.length > 0) {
        const fulfillUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fulfill-uk-report`;
        await Promise.all(
          ukReportItemIds.map(async (id) => {
            try {
              const r = await fetch(fulfillUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order_item_id: id }),
              });
              if (!r.ok) {
                console.error(`fulfill-uk-report failed for ${id}:`, await r.text());
              }
            } catch (e) {
              console.error(`fulfill-uk-report exception for ${id}:`, e);
            }
          }),
        );
      }

      // Trigger API4All order creation (skips items without api4all_product_code)
      const createOrderUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-api4all-order`;
      const createRes = await fetch(createOrderUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: order.id }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('Failed to create API4All order:', errText);
      } else {
        const createData = await createRes.json();
        console.log('API4All order created:', JSON.stringify(createData));
      }

    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;

      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', pi.id)
        .single();

      if (order) {
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        console.log(`Order ${order.id} marked as failed`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
