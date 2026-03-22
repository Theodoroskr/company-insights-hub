import React from 'react';
import PageLayout from '../components/layout/PageLayout';
export default function CheckoutSuccessPage() {
  return <PageLayout><div className="p-8 max-w-3xl mx-auto text-center"><div className="text-5xl mb-4">✅</div><h1 className="text-2xl font-bold mb-2" style={{color:'var(--text-heading)'}}>Order Confirmed!</h1><p style={{color:'var(--text-muted)'}}>Thank you for your order. You will receive a confirmation email shortly.</p></div></PageLayout>;
}
