const paymentMethods = [
  { name: 'Visa', src: '/payment-methods/visa.svg' },
  { name: 'Mastercard', src: '/payment-methods/mastercard.svg' },
  { name: 'American Express', src: '/payment-methods/amex.svg' },
  { name: 'Discover', src: '/payment-methods/discover.svg' },
  { name: 'UnionPay', src: '/payment-methods/unionpay.svg' },
  { name: 'Apple Pay', src: '/payment-methods/apple-pay.svg' },
  { name: 'Google Pay', src: '/payment-methods/google-pay.svg' },
  { name: 'PayPal', src: '/payment-methods/paypal.svg' },
];

export function PaymentMethodLogos({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center ${compact ? 'gap-2' : 'gap-3'}`} aria-label="Supported payment methods">
      {paymentMethods.map((method) => (
        <div
          key={method.name}
          className={`${compact ? 'h-8 w-12 rounded-md' : 'h-10 w-16 rounded-lg'} flex items-center justify-center overflow-hidden border border-white/10 bg-white shadow-sm`}
          title={method.name}
        >
          <img src={method.src} alt={method.name} className="h-full w-full object-contain" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
