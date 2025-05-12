import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const BASIC_PLAN = 'Basic Plan';
export const PLUS_PLAN = 'Plus Plan';
export const PLUS_ADVANCED = 'Plus Advanced';
export const BASIC_PLAN_YEARLY = 'Basic Plan Yearly';
export const PLUS_PLAN_YEARLY = 'Plus Plan Yearly';
export const PLUS_ADVANCED_YEARLY = 'Plus Advanced Yearly';

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  billing: {
    [BASIC_PLAN]: {
      amount: 0.00,
      currencyCode: 'USD',
      interval: BillingInterval.Every30Days,
    },
    [PLUS_PLAN]: {
      amount: 19.99,
      currencyCode: 'USD',
      interval: BillingInterval.Every30Days,
      trialDays: 7, // 7 days free trial


    },
    [PLUS_ADVANCED]: {
      amount: 49.99,
      currencyCode: 'USD',
      interval: BillingInterval.Every30Days,
    },
    [BASIC_PLAN_YEARLY]: {
      amount: 0.00,
      currencyCode: 'USD',
      interval: BillingInterval.Annual,
    },
    [PLUS_PLAN_YEARLY]: {
      amount: 167.92,
      currencyCode: 'USD',
      interval: BillingInterval.Annual,
      trialDays: 7, // 7 days free trial


    },
    [PLUS_ADVANCED_YEARLY]: {
      amount: 455.99,
      currencyCode: 'USD',
      interval: BillingInterval.Annual,
    }
  },
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
