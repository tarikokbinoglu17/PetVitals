export const PETVITALS_PRO_ENTITLEMENT = 'petvitals_pro';
export const PETVITALS_PRO_MONTHLY_PRODUCT = 'petvitals_pro_monthly';
export const PETVITALS_PRO_ANNUAL_PRODUCT = 'petvitals_pro_annual';

export const revenueCatConfigured = Boolean(
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim(),
);

export type BillingPlan = {
  id: 'monthly' | 'annual';
  productId: string;
  title: string;
  subtitle: string;
  badge?: string;
};

export const billingPlans: BillingPlan[] = [
  {
    id: 'annual',
    productId: PETVITALS_PRO_ANNUAL_PRODUCT,
    title: 'Yıllık Pro',
    subtitle: 'En avantajlı plan',
    badge: 'ÖNERİLEN',
  },
  {
    id: 'monthly',
    productId: PETVITALS_PRO_MONTHLY_PRODUCT,
    title: 'Aylık Pro',
    subtitle: 'Esnek aylık abonelik',
  },
];

export function getBillingSetupMessage() {
  if (revenueCatConfigured) return 'RevenueCat bağlantısı hazır. Mağaza ürünleri bağlandığında gerçek satın alma açılır.';
  return 'RevenueCat anahtarları ve mağaza ürünleri eklendiğinde gerçek satın alma açılacak.';
}
