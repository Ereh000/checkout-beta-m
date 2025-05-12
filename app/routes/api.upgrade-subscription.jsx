import {
  authenticate,
  BASIC_PLAN,
  BASIC_PLAN_YEARLY,
  PLUS_ADVANCED,
  PLUS_ADVANCED_YEARLY,
  PLUS_PLAN,
  PLUS_PLAN_YEARLY,
} from "../shopify.server";
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  // Fix: Add error handling and default value for appHandle
  let appHandle;
  try {
    appHandle = session.scope
      .split("/")
      .find((segment) => segment.startsWith("checkout-"));
    if (!appHandle) {
      // Fallback to a default value based on your app name
      appHandle = "elevon-checkout-maximizer";
    }
  } catch (error) {
    console.error("Error extracting appHandle:", error);
    appHandle = "elevon-checkout-maximizer";
  }

  console.log("appHandle:", appHandle);

  const formData = await request.formData();
  const plan = formData.get("plan");

  //   const billingType = formData.get("billingType");

  const returnUrl = `https://admin.shopify.com/store/${shop}/apps/${appHandle}/app/subscription-manage`; //   const returnUrl = `https://admin.shopify.com/store/athatake/apps/checkout-deploy-2/app`;

  console.log("Form Data:", plan);

  if (plan === "basic") {
    await billing.require({
      plans: [BASIC_PLAN],
      onFailure: async () =>
        billing.request({
          plan: BASIC_PLAN,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }
  if (plan === "plus") {
    await billing.require({
      plans: [PLUS_PLAN],
      onFailure: async () =>
        billing.request({
          plan: PLUS_PLAN,
          trialDays: 7,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }
  if (plan === "plusAdvanced") {
    await billing.require({
      plans: [PLUS_ADVANCED],
      onFailure: async () =>
        billing.request({
          plan: PLUS_ADVANCED,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }
  if (plan === "basicYearly") {
    await billing.require({
      plans: [BASIC_PLAN_YEARLY],
      onFailure: async () =>
        billing.request({
          plan: BASIC_PLAN_YEARLY,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }
  if (plan === "plusYearly") {
    await billing.require({
      plans: [PLUS_PLAN_YEARLY],
      onFailure: async () =>
        billing.request({
          plan: PLUS_PLAN_YEARLY,
          trialDays: 7,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }
  if (plan === "plusAdvancedYearly") {
    await billing.require({
      plans: [PLUS_ADVANCED_YEARLY],
      onFailure: async () =>
        billing.request({
          plan: PLUS_ADVANCED_YEARLY,
          isTest: true,
          returnUrl: returnUrl,
        }),
    });
  }

  // After successful subscription, set the metafield
  try {
    // Create a GraphQL client
    const client = new admin.graphql.GraphQLClient({
      session,
    });

    // Set the metafield to indicate active plan
    const metafieldResponse = await client.query({
      data: {
        query: `
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                namespace
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          metafields: [
            {
              namespace: "billing",
              key: "active_plan",
              value: plan,
              ownerId: `gid://shopify/App/${session.id}`,
              type: "single_line_text_field",
            },
          ],
        },
      },
    });

    console.log("Metafield set response:", metafieldResponse);
    return json({ success: true, plan });
  } catch (error) {
    console.error("Error setting metafield:", error);
  }

  return json({ success: true, plan });
};
