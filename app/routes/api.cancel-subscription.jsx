import { json } from "@remix-run/node";
import {
  authenticate,
  BASIC_PLAN,
  BASIC_PLAN_YEARLY,
  PLUS_ADVANCED,
  PLUS_ADVANCED_YEARLY,
  PLUS_PLAN,
  PLUS_PLAN_YEARLY,
} from "../shopify.server"; // Adjust path if needed

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  console.log("Cancelling Subscription Formdata:", formData)
  const plan = formData.get("plan");

  //   const { session, billing } = await authenticate.admin(request);
  const { billing } = await authenticate.admin(request);

  try {
    if (plan === "Basic Plan") {
      const billingCheck = await billing.require({
        plans: [BASIC_PLAN],
        onFailure: async () => billing.request({ plan: BASIC_PLAN }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }

    if (plan === "Basic Plan Yearly") {
      const billingCheck = await billing.require({
        plans: [BASIC_PLAN_YEARLY],
        onFailure: async () => billing.request({ plan: BASIC_PLAN_YEARLY }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }

    if (plan === "Plus Plan") {
      const billingCheck = await billing.require({
        plans: [PLUS_PLAN],
        onFailure: async () => billing.request({ plan: PLUS_PLAN }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }
    if(plan === "Plus Plan Yearly") {
      const billingCheck = await billing.require({
        plans: [PLUS_PLAN_YEARLY],
        onFailure: async () => billing.request({ plan: PLUS_PLAN_YEARLY }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,   
        prorate: true,
      })
    }
    if (plan === "Plus Advanced") {
      const billingCheck = await billing.require({
        plans: [PLUS_ADVANCED],
        onFailure: async () => billing.request({ plan: PLUS_ADVANCED }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }
    if (plan === "Plus Advanced Yearly") {
      const billingCheck = await billing.require({
        plans: [PLUS_ADVANCED_YEARLY],
        onFailure: async () =>
          billing.request({ plan: PLUS_ADVANCED_YEARLY }),
      });

      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      })
    }

    // const billingCheck = await billing.require({
    //   plans: [BASIC_PLAN],
    //   onFailure: async () => billing.request({ plan: MONTHLY_PLAN }),
    // });

    // const subscription = billingCheck.appSubscriptions[0];
    // const cancelledSubscription = await billing.cancel({
    //   subscriptionId: subscription.id,
    //   isTest: true,
    //   prorate: true,
    // });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    // Check if it's a Shopify API error response
    let errorMessage = "An unknown error occurred during cancellation.";
    if (error.response && error.response.errors) {
      // Try to extract a more specific error message
      errorMessage = JSON.stringify(error.response.errors);
    } else if (error.message) {
      errorMessage = error.message;
    }
    return json({ success: false, error: errorMessage }, { status: 500 });
  }
  return null;
};

// No loader needed for this action-only route
// export const loader = () => {
//   throw new Response("Not Found", { status: 404 });
// };
