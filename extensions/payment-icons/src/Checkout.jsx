import {
  reactExtension,
  Text,
  useSettings,
  PaymentIcon,
  InlineStack,
  BlockSpacer,
  Link,
  useMetafield,
  useMetafields,
  useAppMetafields,
  View,
} from "@shopify/ui-extensions-react/checkout";

// --------------------- Checkout Page Block Rendering -------------------------------
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

// --------------------- Thankyou Page Block Rendering -------------------------------
const thankYouRender = reactExtension("purchase.thank-you.block.render", () => (
  <Extension />
));
export { thankYouRender };

// --------------------- Orddr Status Page Block Rendering -------------------------------
const orderDetailsRender = reactExtension(
  "customer-account.order-status.block.render",
  () => <Extension />
);
export { orderDetailsRender };

function Extension() {
  const {
    banner_title,
    image_1_icon,
    image_1_url,
    image_2_icon,
    image_2_url,
    image_3_icon,
    image_3_url,
    image_4_icon,
    image_4_url,
    image_5_icon,
    image_5_url,
    image_6_icon,
    image_6_url,
  } = useSettings();

  const metafields = useAppMetafields();
  // Extract metafield data
  const shopMetafield = metafields.find(
    (metafield) =>
      metafield.target.type === "shop" &&
      metafield.metafield.namespace === "billing" &&
      metafield.metafield.key === "active_plan"
  )?.metafield.value;
  console.log("shopMetafield:", shopMetafield); // Add this line to log the metafield value

  // if()

  // Create an array of payment icons and URLs from settings
  const paymentMethods = [
    { icon: image_1_icon, url: image_1_url },
    { icon: image_2_icon, url: image_2_url },
    { icon: image_3_icon, url: image_3_url },
    { icon: image_4_icon, url: image_4_url },
    { icon: image_5_icon, url: image_5_url },
    { icon: image_6_icon, url: image_6_url },
  ].filter((method) => method.icon && method.icon !== "none");

  return (
    <>
      {shopMetafield === "Plus Plan" && (
        <View>
          <InlineStack inlineAlignment="center" blockAlignment="center">
            <Text size="medium" emphasis="bold">
              {banner_title || "Try Our Payment Icons"}
            </Text>
          </InlineStack>
          <BlockSpacer spacing="loose" />
          <InlineStack inlineAlignment="center" blockAlignment="center">
            {paymentMethods.map((method, index) =>
              method.url ? (
                <Link key={index} to={method.url}>
                  <PaymentIcon name={method.icon} />
                </Link>
              ) : (
                <PaymentIcon key={index} name={method.icon} />
              )
            )}
          </InlineStack>
        </View> 
      )}
    </>
  );
}
