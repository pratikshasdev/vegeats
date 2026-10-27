// Subscription seam for a future premium tier (RevenueCat), switched off in v1.
//
// To turn it on later:
//   1. npx expo install react-native-purchases  (needs a development build)
//   2. Create the "premium" entitlement in RevenueCat and add the iOS / Android API keys
//      as EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.
//   3. Implement `revenueCatClient` with Purchases.configure / getCustomerInfo and set
//      SUBSCRIPTIONS_ENABLED to true. Screens only ever call `useEntitlement`.

import { useEffect, useState } from 'react';

export const SUBSCRIPTIONS_ENABLED = false;

export type Entitlement = 'premium';

/** Features a premium tier could unlock; every one is free while subscriptions are off. */
export const PREMIUM_FEATURES = {
  advancedFilters: 'premium',
  offlineSaves: 'premium',
} as const satisfies Record<string, Entitlement>;

export interface SubscriptionClient {
  configure(userId: string | null): Promise<void>;
  hasEntitlement(entitlement: Entitlement): Promise<boolean>;
}

/** v1 client: everyone has every feature. */
const freeClient: SubscriptionClient = {
  configure: async () => undefined,
  hasEntitlement: async () => true,
};

let client: SubscriptionClient = freeClient;

export function setSubscriptionClient(next: SubscriptionClient) {
  client = next;
}

export function getSubscriptionClient(): SubscriptionClient {
  return SUBSCRIPTIONS_ENABLED ? client : freeClient;
}

/** `true` while loading or when subscriptions are off, so nothing is ever hidden by accident. */
export function useEntitlement(entitlement: Entitlement): boolean {
  const [has, setHas] = useState(true);
  useEffect(() => {
    let alive = true;
    getSubscriptionClient()
      .hasEntitlement(entitlement)
      .then((v) => alive && setHas(v))
      .catch(() => alive && setHas(true));
    return () => {
      alive = false;
    };
  }, [entitlement]);
  return has;
}
