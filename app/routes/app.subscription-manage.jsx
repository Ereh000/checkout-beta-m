import React, { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Tabs,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  Link,
  Banner,
  Modal,
  DataTable,
  Icon,
} from "@shopify/polaris";

import {
  authenticate,
  BASIC_PLAN,
  PLUS_PLAN,
  BASIC_PLAN_YEARLY,
  PLUS_PLAN_YEARLY,
} from "../shopify.server";

import { XIcon, CheckIcon } from "@shopify/polaris-icons";

import { useFetcher, useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  // Import the entire module first
  const { BillingInterval } = await import("@shopify/shopify-api");
  const { billing, admin, session } = await authenticate.admin(request);

  // Get shop data to check if it's a development store
  const shop = await admin.graphql(`
      query {
        shop {
          id
          plan {
            partnerDevelopment
          }
        }
      }
    `);
  const shopData = await shop.json();
  const isDevelopmentStore = shopData.data?.shop?.plan?.partnerDevelopment;
  const shopGid = shopData.data?.shop?.id;
  // console.log("Shop Data:", shopData.data?.shop?.plan?.partnerDevelopment);

  // Check which plans the user has
  const subscriptions = await billing.check({
    plans: [BASIC_PLAN, PLUS_PLAN, BASIC_PLAN_YEARLY, PLUS_PLAN_YEARLY],
    isTest: true,
  });

  console.log("Subscriptions:", subscriptions);

  // Get billing configuration
  const billingConfig = {
    // Monthly plans
    [BASIC_PLAN]: {
      amount: 0.0,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
    },
    [PLUS_PLAN]: {
      amount: 19.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 7, // Add 7-day free trial
    },
    // Yearly plans
    [BASIC_PLAN_YEARLY]: {
      amount: 0.0,
      currencyCode: "USD",
      interval: BillingInterval.Annual,
    },
    [PLUS_PLAN_YEARLY]: {
      amount: 167.92,
      currencyCode: "USD",
      interval: BillingInterval.Annual,
      trialDays: 7, // Add 7-day free trial
    },
  };

  // Create a GraphQL client
  // const client = new admin.graphql.GraphQLClient({
  //   session,
  // });

  const hasActivePayment = await billing.check({
    plans: [BASIC_PLAN, PLUS_PLAN, BASIC_PLAN_YEARLY, PLUS_PLAN_YEARLY],
    isTest: true,
  });

  const CurrentPlan = hasActivePayment?.appSubscriptions[0]?.name || "";

  // console.log("hasActivePayment:", hasActivePayment?.hasActivePayment);
  // console.log("Current Plan:", hasActivePayment?.appSubscriptions[0]?.name);

  // Set the metafield to indicate active plan
  const metafieldResponse = await admin.graphql(
    `#graphql
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
                createdAt
                updatedAt
              }
              userErrors {
                field
                message
                code
              }
            }
          }`,
    {
      variables: {
        metafields: [
          {
            namespace: "billing",
            key: "active_plan",
            value: CurrentPlan || "none",
            ownerId: shopGid,
            type: "single_line_text_field",
          },
        ],
      },
    }
  );

  const metafield = (await metafieldResponse.json()).data?.metafieldsSet
    ?.metafields?.[0];
  // const metafield = metafieldResponse.json().data?.metafieldsSet?.metafields?.[0];
  // if (metafield) {
    console.log("Metafield set response:", metafield);
  // }

  // Return plan constants to the client along with active plan and pricing
  return {
    activePlan:
      subscriptions.appSubscriptions.length > 0
        ? subscriptions.appSubscriptions[0].name
        : null,
    planConstants: {
      BASIC_PLAN: BASIC_PLAN,
      PLUS_PLAN: PLUS_PLAN,
      BASIC_PLAN_YEARLY: BASIC_PLAN_YEARLY,
      PLUS_PLAN_YEARLY: PLUS_PLAN_YEARLY,
    },
    billingConfig,
    isDevelopmentStore,
  };
}

export default function MainSubscriptionManage() {
  const { activePlan, planConstants, billingConfig, isDevelopmentStore } =
    useLoaderData();
  const { BASIC_PLAN, PLUS_PLAN, BASIC_PLAN_YEARLY, PLUS_PLAN_YEARLY } =
    planConstants || {};
  console.log("Plan Constants:", planConstants);
  console.log("Billing Config:", billingConfig);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [planToCancel, setPlanToCancel] = useState(null);
  // Update the handleCancel function
  const handleCancelClick = (plan) => {
    setPlanToCancel(plan);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    cancelFetcher.submit(
      {
        plan: planToCancel,
        billingType: selectedBilling,
      },
      { method: "post", action: "/api/cancel-subscription" }
    );
    setShowCancelModal(false);
  };

  console.log("Active Plan:", activePlan);
  const activePlanMain = activePlan;

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  // const fetcher = useFetcher();
  const upgradeFetcher = useFetcher(); // Rename existing fetcher for clarity
  const cancelFetcher = useFetcher(); // Add a new fetcher for cancellation

  // const isLoading = fetcher.state !== "idle";
  const isLoading = upgradeFetcher.state !== "idle";
  const isCancelling = cancelFetcher.state !== "idle";

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTabIndex(selectedTabIndex),
    []
  );

  const tabs = [
    {
      id: "monthly",
      content: "Pay Monthly",
      accessibilityLabel: "Pay Monthly",
      panelID: "monthly-content",
    },
    {
      id: "yearly",
      content: (
        <InlineStack gap="200" blockAlign="center">
          Pay Yearly <Badge tone="success">Save 30%</Badge>
        </InlineStack>
      ),
      panelID: "yearly-content",
    },
  ];

  // Use dynamic pricing from billing config
  const prices = {
    monthly: {
      basic: billingConfig[BASIC_PLAN]
        ? `$${billingConfig[BASIC_PLAN].amount}`
        : "$0.00",
      plus: billingConfig[PLUS_PLAN]
        ? `$${billingConfig[PLUS_PLAN].amount}`
        : "$19.99",
    },
    yearly: {
      basic: billingConfig[BASIC_PLAN_YEARLY]
        ? `$${billingConfig[BASIC_PLAN_YEARLY].amount}`
        : "$0.00",
      plus: billingConfig[PLUS_PLAN_YEARLY]
        ? `$${billingConfig[PLUS_PLAN_YEARLY].amount}`
        : "$167.92",
    },
  };

  // Calculate monthly equivalent for yearly plans for display
  const yearlyMonthlyEquivalent = {
    basic: billingConfig[BASIC_PLAN_YEARLY]
      ? `$${(billingConfig[BASIC_PLAN_YEARLY].amount / 12).toFixed(2)}`
      : "$0.00",
    plus: billingConfig[PLUS_PLAN_YEARLY]
      ? `$${(billingConfig[PLUS_PLAN_YEARLY].amount / 12).toFixed(2)}`
      : "$13.99",
  };

  const selectedBilling = selectedTabIndex === 0 ? "monthly" : "yearly";
  const priceSuffix = selectedTabIndex === 0 ? "/mo" : "/mo"; // Adjust suffix if needed

  // For yearly billing, we'll show the monthly equivalent
  const displayPrices =
    selectedTabIndex === 0 ? prices.monthly : yearlyMonthlyEquivalent;

  // For yearly billing, we'll show the total yearly price in a smaller text
  const yearlyTotalPrices = prices.yearly;

  const handleSubscribe = (plan) => {
    upgradeFetcher.submit(
      {
        plan,
        billingType: selectedBilling,
      },
      { method: "post", action: "/api/upgrade-subscription" }
    );
  };

  // Helper function to check if a plan is active
  const isPlanActive = (planName) => {
    if (!activePlan) return false;

    // Map the plan names to match the ones returned by the billing API
    const planMapping = {
      basic: BASIC_PLAN,
      plus: PLUS_PLAN,
      basicYearly: BASIC_PLAN_YEARLY,
      plusYearly: PLUS_PLAN_YEARLY,
    };

    return activePlan === planMapping[planName];
  };

  // console.log("isPlanActive);

  // Get human-readable plan name for the banner
  const getReadablePlanName = () => {
    if (!activePlan) return "";

    if (activePlan === BASIC_PLAN) return "Starter Plan";
    if (activePlan === PLUS_PLAN) return "Pro Plan";
    if (activePlan === PLUS_PLAN_YEARLY) return "Pro Plan Yearly";

    return activePlan; // Fallback to the raw plan name
  };

  // Updated feature comparison data based on the image
  const featureComparisonData = [
    ["Checkout Page Customization", true, true],
    ["Social Media Icons", true, true],
    ["Testimonials Block", true, true],
    ["Free Shipping / Discount Bar", true, true],
    ["Custom Banner (limited)", true, true],
    ["Line Item Message", false, true],
    ["Featured Products / Upsells", false, true],
    ["Custom Input Fields", false, true],
    ["Custom Buttons", false, true],
    // ["Reorder Shipping Methods", false, true],
    ["Hide Shipping Method (rules)", false, true],
    ["Message to Shipping Method", false, true],
    // ["Reorder Payment Methods", false, true],
    ["Hide Payment Methods", false, true],
    ["Rename Payment Method", false, true],
    ["Priority Support", false, true],
  ];

  // Format the data for the DataTable component
  const formattedFeatureData = featureComparisonData.map(
    ([feature, starter, pro]) => [
      <Text variant="bodyMd">{feature}</Text>,
      starter ? (
        <Icon source={CheckIcon} tone="success" />
      ) : (
        <Icon source={XIcon} tone="critical" />
      ),
      pro ? (
        <Icon source={CheckIcon} tone="success" />
      ) : (
        <Icon source={XIcon} tone="critical" />
      ),
    ]
  );

  return (
    <Page title="Manage Subscription">
      {activePlan && (
        <>
          <Banner
            title={`You are currently subscribed to the ${getReadablePlanName()}`}
            tone="success"
          >
            <p>
              You can upgrade your plan at any time to access more features.
            </p>
            <div style={{ marginTop: "10px" }}>
              <Button
                onClick={() => handleCancelClick(activePlanMain)}
                loading={isCancelling}
                disabled={isCancelling}
                variant="primary"
              >
                Cancel Subscription
              </Button>
            </div>
          </Banner>

          {cancelFetcher.data?.success === false && (
            <Banner title="Cancellation Failed" tone="critical">
              <p>{cancelFetcher.data.error || "An unknown error occurred."}</p>
            </Banner>
          )}
          {cancelFetcher.data?.success === true && (
            <Banner title="Subscription Cancelled" tone="success">
              <p>Your subscription has been cancelled successfully.</p>
            </Banner>
          )}
          <br />
        </>
      )}
      {/* Banner for development stores */}
      {isDevelopmentStore && (
        <>
          <Banner title="Development Store" tone="info">
            <p>
              You are currently on a development store. All plans are free to
              use & testing for development stores.
            </p>
          </Banner>
          <br />
        </>
      )}

      <Box paddingBlockEnd="400">
        <Card padding="0">
          <Tabs
            tabs={tabs}
            selected={selectedTabIndex}
            onSelect={handleTabChange}
            fitted
          />
        </Card>
      </Box>

      {/* Plan comparison section */}
      <Card>
        <BlockStack gap="600">
          <InlineStack align="center" gap="200"></InlineStack>

          {/* Starter cards */}
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400" inlineAlign="center">
                  <Text variant="headingXl" as="h2" fontWeight="bold">
                    Starter Plan (Free)
                  </Text>
                  <div
                    className=""
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                    }}
                  >
                    <Text variant="headingLg" as="p" fontWeight="bold">
                      $0
                    </Text>
                    {/* <Text as="span" variant="bodyMd" tone="subdued">
                      /mo
                    </Text> */}
                  </div>
                  <Button
                    onClick={() =>
                      handleSubscribe(
                        selectedTabIndex === 0 ? "basic" : "basicYearly"
                      )
                    }
                    variant="primary"
                    disabled
                    size="large"
                    fullWidth
                    loading={
                      isLoading &&
                      (upgradeFetcher.formData?.get("plan") === "basic" ||
                        upgradeFetcher.formData?.get("plan") === "basicYearly")
                    }
                    // disabled={isPlanActive("basic")}
                  >
                    {isPlanActive("basic")
                      ? "Started Already"
                      : "Started Already"}
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400" inlineAlign="center">
                  <Text variant="headingXl" as="h2" fontWeight="bold">
                    Pro Plan
                  </Text>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                    }}
                  >
                    <Text variant="headingLg" as="p" fontWeight="bold">
                      {displayPrices.plus}
                    </Text>
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {priceSuffix}
                    </Text>
                    {selectedTabIndex === 1 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        (or {yearlyTotalPrices.plus} billed annually)
                      </Text>
                    )}
                  </div>
                  {/* Add trial badge */}

                  <Badge tone="success">7-day free trial</Badge>

                  <Button
                    onClick={() =>
                      handleSubscribe(
                        selectedTabIndex === 0 ? "plus" : "plusYearly"
                      )
                    }
                    variant="primary"
                    fullWidth
                    size="large"
                    loading={
                      isLoading &&
                      (upgradeFetcher.formData?.get("plan") === "plus" ||
                        upgradeFetcher.formData?.get("plan") === "plusYearly")
                    }
                    disabled={
                      (selectedTabIndex === 0 && isPlanActive("plus")) ||
                      (selectedTabIndex === 1 && isPlanActive("plusYearly"))
                    }
                  >
                    {isPlanActive("plus") || isPlanActive("plusYearly")
                      ? "Current Plan"
                      : "Upgrade to Pro"}
                  </Button>
                  {/* {isPlanActive("plus") || isPlanActive("plusYearly") ? (
                    <Text as="p" variant="bodySm" tone="success">
                      Your active subscription
                    </Text>
                  ) : (
                    <Text
                      alignment="center"
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      If you are on the Shopify Plus Trial Please Contact Us To
                      Upgrade
                    </Text>
                  )} */}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          {/* Feature comparison table */}
          <Card>
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={[
                <Text variant="headingMd">Feature</Text>,
                <Text variant="headingMd">Starter Plan (Free)</Text>,
                <Text variant="headingMd">
                  Pro Plan ({displayPrices.plus}
                  {priceSuffix})
                </Text>,
              ]}
              rows={formattedFeatureData}
              increasedTableDensity
            />
          </Card>

          <Box paddingBlockStart="400" paddingBlockEnd="400">
            <InlineStack align="center">
              <Text as="p" variant="bodyMd">
                Have a question or feature request for Checkout Plus?{" "}
                <Link url="#">Contact Us</Link>
              </Text>
            </InlineStack>
          </Box>
        </BlockStack>
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        primaryAction={{
          content: "Yes, Cancel Subscription",
          destructive: true,
          onAction: handleCancelConfirm,
          loading: isCancelling,
        }}
        secondaryActions={[
          {
            content: "No, Keep Subscription",
            onAction: () => setShowCancelModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              Are you sure you want to cancel your subscription? This action
              cannot be undone.
            </Text>
            <Text as="p" tone="warning">
              After cancellation:
            </Text>
            <ul style={{ paddingLeft: "20px" }}>
              <li>
                Your access will continue until the end of your current billing
                period
              </li>
              <li>You will lose access to premium features</li>
              <li>
                Your settings and configurations will be preserved if you
                resubscribe later
              </li>
            </ul>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <br />
      <br />
    </Page>
  );
}
