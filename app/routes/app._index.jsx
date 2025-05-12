// _index.jsx
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Grid,
  Icon,
  MediaCard,
  VideoThumbnail,
  BlockStack, // Added BlockStack
  InlineStack, // Added InlineStack
  Box,
  Banner, // Added Box for icon styling
} from "@shopify/polaris";

import {
  CartUpIcon,
  CartIcon,
  CreditCardSecureIcon,
  DeliveryFilledIcon,
  OrderFulfilledIcon,
  StoreIcon,
  AppsIcon,
  LayoutBuyButtonHorizontalIcon,
} from "@shopify/polaris-icons";
import { authenticate, PLUS_PLAN, PLUS_PLAN_YEARLY } from "../shopify.server";
import { json, useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  const { admin, session, billing } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query GetCheckoutProfile {
      checkoutProfiles(first: 1, query: "is_published:true") {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `);

  const data = await response.json();
  const checkoutProfile = data.data.checkoutProfiles.edges[0].node;
  console.log("checkoutProfile", checkoutProfile);

  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [PLUS_PLAN, PLUS_PLAN_YEARLY],
    isTest: true,
  });

  const shopResponse = await admin.graphql(`
    query {
      shop {
        id
        plan {
          displayName
          partnerDevelopment
          shopifyPlus
        }
      }
    }
  `);
  const shopData = await shopResponse.json();
  const shopPlan = shopData.data?.shop?.plan;
  console.log("shop plan", shopPlan);

  // const checkoutProfileId = checkoutProfile.id;
  // Extract the numeric ID from the GID
  const profileId = checkoutProfile.id.split("/").pop();

  return json({
    checkoutProfileId: profileId,
    shop: session.shop.split(".myshopify.com")[0], // Get shop name without domain
    shopPlan,
    hasActivePayment,
    appSubscriptions,
  });
}

// import { Redirect

export default function Index() {
  const { shopPlan, hasActivePayment, appSubscriptions } = useLoaderData();
  console.log("shopPlan:", shopPlan);
  console.log("hasActivePayment:", hasActivePayment);

  return (
    <>
      <Page>
        {/* Checking shopify plus or dev. preview */}
        {shopPlan.displayName !== "Developer Preview" &&
          !shopPlan.shopifyPlus && (
            <>
              <Banner title="Checkout can't be Customized" tone="warning">
                <p>
                  You store type is not Shopify Plus or Developer's Preview. You
                  can't customize checkout page.
                </p>
              </Banner>
              <br />
            </>
          )}
        {!hasActivePayment && (
          <>
            <Banner
              title="Upgrade Plan to get all features"
              action={{
                content: "Upgrade Now",
                url: "/app/subscription-manage",
                variant: "primary",
              }}
              tone="warning"
            >
              <p>
                With your current Free plan, you can still create and save
                extensions. However, to make these extensions work on your
                checkout page, you'll need to upgrade to Premium.
              </p>
            </Banner>
            <br />
          </>
        )}

        <>
          <Grid>
            <Grid.Cell
              gap="400"
              columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
            >
              <PaymentAndShippingCustomizations />
              <br />
              <ExtensionsSection />
            </Grid.Cell>
            {/* <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
              <MediaCard
                portrait
                title="Getting Started with Checkout Plus"
                primaryAction={{
                  content: "Learn more",
                  onAction: () => {},
                }}
                description="Thank you for using Checkout Plus. Here is an in depth guide.."
                popoverActions={[{ content: "Dismiss", onAction: () => {} }]}
              >
                <VideoThumbnail
                  videoLength={80}
                  thumbnailUrl="https://94m.app/images/Getting-Started-Thumbnail.webp"
                  onClick={() => console.log("clicked")}
                />
              </MediaCard>
            </Grid.Cell> */}
            {/* row 2 */}
            {/* <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 8, xl: 8 }}>
              <ExtensionsSection />
            </Grid.Cell> */}
          </Grid>
        </>
        <br />
        <br />
      </Page>
    </>
  );
}

export function PaymentAndShippingCustomizations() {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Payment & Shipping Customizations
        </Text>
        <BlockStack gap="300">
          {/* Payment Customizations */}
          <Card>
            <InlineStack
              align="space-between"
              blockAlign="center"
              justify="space-between"
              wrap={false}
            >
              <InlineStack gap="400" blockAlign="center" wrap={false}>
                <Icon source={CreditCardSecureIcon} />
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Payment Customizations
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Hide, modify or reorder your payment options at checkout
                  </Text>
                </BlockStack>
              </InlineStack>
              <Button variant="primary" url="/app/payment-customization">
                Manage
              </Button>
            </InlineStack>
          </Card>

          {/* Shipping Customizations */}
          <Card>
            <InlineStack
              align="space-between"
              blockAlign="center"
              justify="space-between"
              wrap={false}
            >
              <InlineStack gap="400" blockAlign="center" wrap={false}>
                <Icon source={DeliveryFilledIcon} />
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Shipping Customizations
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Add a message or hide your shipping methods
                  </Text>
                </BlockStack>
              </InlineStack>
              <Button url="/app/shipping-customizations" variant="primary">
                Manage
              </Button>
            </InlineStack>
          </Card>

          {/* Checkout Branding Customizations & Styleing */}
          <Card>
            <InlineStack
              align="space-between"
              blockAlign="center"
              justify="space-between"
              wrap={false}
            >
              <InlineStack gap="400" blockAlign="center" wrap={false}>
                <Icon source={LayoutBuyButtonHorizontalIcon} />
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Customize Checkout Styles (Free)
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Change the color schemes, fonts, and more of your checkout
                    page
                  </Text>
                </BlockStack>
              </InlineStack>
              <Button url="/app/customization" variant="primary">
                Customize
              </Button>
            </InlineStack>
          </Card>

          {/* Order Validations - Uncomment if needed later
          <Card background="bg-surface-secondary">
            <InlineStack align="center" blockAlign="center" justify="space-between" wrap={false}>
              <InlineStack gap="400" blockAlign="center" wrap={false}>
                <Icon source={AlertCircleIcon} color="critical" />
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Order Validations
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Block suspicious orders based on address, customer tags, etc
                  </Text>
                </BlockStack>
              </InlineStack>
              <Button variant="primary" disabled>Coming Soon</Button>
            </InlineStack>
          </Card>
          */}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

function ExtensionsSection() {
  const { checkoutProfileId, shop } = useLoaderData();

  const openCheckoutEditor = (page) => {
    const url = `https://admin.shopify.com/store/${shop}/settings/checkout/editor/profiles/${checkoutProfileId}?page=${page}`;
    window.open(url, "_blank");
  };

  // Helper component for individual extension cards
  const ExtensionCard = ({
    icon,
    title,
    description,
    buttonLabel,
    onAction,
    buttonUrl,
    buttonPlain,
  }) => (
    <Card>
      <BlockStack gap="300">
        <Box
          borderWidth="025"
          borderColor="border"
          borderRadius="200"
          padding="300"
          width="fit-content"
        >
          <Icon source={icon} />
        </Box>
        <BlockStack gap="100">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {title}
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            {description}
          </Text>
        </BlockStack>
        <Button
          variant="primary"
          onClick={onAction}
          url={buttonUrl}
          plain={buttonPlain}
          fullWidth // Make button take full width of its container if desired
        >
          {buttonLabel}
        </Button>
      </BlockStack>
    </Card>
  );

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Extensions
        </Text>
        <Grid>
          {/* Checkout Extensions */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <ExtensionCard
              icon={CartIcon}
              title="Checkout Extensions"
              description="Custom messages, gift message, trust badges, etc"
              buttonLabel="Get Started"
              onAction={() => openCheckoutEditor("checkout")}
              buttonPlain // Use plain style for Get Started
            />
          </Grid.Cell>

          {/* Thank You Extensions */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <ExtensionCard
              icon={StoreIcon}
              title="Thank You Extensions"
              description="Custom messages, share social media, contact info, etc"
              buttonLabel="Get Started"
              onAction={() => openCheckoutEditor("thank-you")}
              buttonPlain // Use plain style for Get Started
            />
          </Grid.Cell>

          {/* Order Status Extensions */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <ExtensionCard
              icon={OrderFulfilledIcon}
              title="Order Status Extensions"
              description="Custom messages, share social media, contact info, etc"
              buttonLabel="Get Started"
              onAction={() => openCheckoutEditor("order-status")}
              // No buttonPlain here, default primary style
            />
          </Grid.Cell>

          {/* Upsells */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <ExtensionCard
              icon={CartUpIcon}
              title="Upsells"
              description="Offer advanced customizations like upsells"
              buttonLabel="Manage"
              buttonUrl="/app/manage-upsell"
              // No buttonPlain here, default primary style
            />
          </Grid.Cell>

          {/* Explore more extension */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <ExtensionCard
              icon={AppsIcon}
              title="Explore more extensions"
              description="Browse more extensions for your store"
              buttonLabel="See more options"
              onAction={() => openCheckoutEditor("checkout")} // Link to checkout editor for exploring
              // No buttonPlain here, default primary style
            />
          </Grid.Cell>

          {/* Add placeholders for future extensions if needed */}
          {/*
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
             <Card><BlockStack gap="300">...</BlockStack></Card>
          </Grid.Cell>
          */}
        </Grid>
      </BlockStack>
    </Card>
  );
}
