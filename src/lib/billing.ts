import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

export const PETVITALS_PRO_ENTITLEMENT = "petvitals_pro";
export const PETVITALS_PRO_MONTHLY_PRODUCT = "petvitals_pro_monthly";
export const PETVITALS_PRO_ANNUAL_PRODUCT = "petvitals_pro_annual";

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
const androidApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
const webApiKey = process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY?.trim();

function platformApiKey() {
  if (Platform.OS === "ios") return iosApiKey;
  if (Platform.OS === "android") return androidApiKey;
  if (Platform.OS === "web") return webApiKey;
  return undefined;
}

export const revenueCatConfigured = Boolean(platformApiKey());

export type BillingPlanId = "monthly" | "annual";
export type BillingPlan = {
  id: BillingPlanId;
  productId: string;
  title: string;
  subtitle: string;
  badge?: string;
};

export type BillingPrices = Partial<Record<BillingPlanId, string>>;

export const billingPlans: BillingPlan[] = [
  {
    id: "annual",
    productId: PETVITALS_PRO_ANNUAL_PRODUCT,
    title: "Yıllık Pro",
    subtitle: "En avantajlı plan",
    badge: "ÖNERİLEN",
  },
  {
    id: "monthly",
    productId: PETVITALS_PRO_MONTHLY_PRODUCT,
    title: "Aylık Pro",
    subtitle: "Esnek aylık abonelik",
  },
];

let configuredUserId: string | null = null;

export function hasProEntitlement(customerInfo: CustomerInfo) {
  return Boolean(
    customerInfo.entitlements.active[PETVITALS_PRO_ENTITLEMENT]?.isActive,
  );
}

export async function configureBilling(userId: string) {
  const apiKey = platformApiKey();
  if (!apiKey || userId === "demo") return false;
  if (!configuredUserId) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, appUserID: userId });
    configuredUserId = userId;
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
  return true;
}

async function currentPackages() {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  if (!offering) throw new Error("Mağaza abonelik paketleri bulunamadı.");
  return offering;
}

function packageForPlan(
  plan: BillingPlanId,
  packages: PurchasesPackage[],
) {
  const productId =
    plan === "annual"
      ? PETVITALS_PRO_ANNUAL_PRODUCT
      : PETVITALS_PRO_MONTHLY_PRODUCT;
  return packages.find((item) => item.product.identifier === productId);
}

export async function getBillingState(userId: string) {
  const configured = await configureBilling(userId);
  if (!configured) {
    return {
      configured: false,
      subscribed: false,
      prices: {} as BillingPrices,
    };
  }
  const [customerInfo, offering] = await Promise.all([
    Purchases.getCustomerInfo(),
    currentPackages(),
  ]);
  const annual =
    offering.annual ?? packageForPlan("annual", offering.availablePackages);
  const monthly =
    offering.monthly ?? packageForPlan("monthly", offering.availablePackages);
  return {
    configured: true,
    subscribed: hasProEntitlement(customerInfo),
    prices: {
      annual: annual?.product.priceString,
      monthly: monthly?.product.priceString,
    } satisfies BillingPrices,
  };
}

export async function purchaseBillingPlan(
  userId: string,
  plan: BillingPlanId,
) {
  if (!(await configureBilling(userId))) {
    throw new Error("Ödeme altyapısı bu cihaz için yapılandırılmamış.");
  }
  const offering = await currentPackages();
  const selected =
    (plan === "annual" ? offering.annual : offering.monthly) ??
    packageForPlan(plan, offering.availablePackages);
  if (!selected) throw new Error("Seçilen mağaza paketi bulunamadı.");
  const result = await Purchases.purchasePackage(selected);
  if (!hasProEntitlement(result.customerInfo)) {
    throw new Error("Satın alma tamamlandı ancak Premium erişimi doğrulanamadı.");
  }
  return result.customerInfo;
}

export async function restoreBillingPurchases(userId: string) {
  if (!(await configureBilling(userId))) {
    throw new Error("Ödeme altyapısı bu cihaz için yapılandırılmamış.");
  }
  const customerInfo = await Purchases.restorePurchases();
  if (!hasProEntitlement(customerInfo)) {
    throw new Error("Bu mağaza hesabında aktif Premium aboneliği bulunamadı.");
  }
  return customerInfo;
}

export function isUserCancelledPurchase(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "userCancelled" in error &&
      (error as { userCancelled?: boolean }).userCancelled,
  );
}

export function getBillingSetupMessage() {
  if (revenueCatConfigured) {
    return "Mağaza bağlantısı hazır; yerel fiyat satın alma ekranında gösterilir.";
  }
  return "RevenueCat genel SDK anahtarı ve mağaza ürünleri bağlandığında satın alma açılır.";
}
