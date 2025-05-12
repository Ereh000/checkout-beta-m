import { useState, useEffect } from "react";
import {
  reactExtension,
  Text,
  Progress,
  useSettings,
  useCartLines,
  BlockLayout,
  View,
  BlockStack,
  Heading,
} from "@shopify/ui-extensions-react/checkout";

reactExtension("purchase.checkout.block.render", () => (
  <FreeShippingProgress />
));

export default function FreeShippingProgress() {
  const settings = useSettings();
  const freeShippingLimit = settings?.freeShippingLimit || 100; // Default limit
  const cartLines = useCartLines();
  const { heading, subheading } = useSettings();
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    const total = cartLines.reduce(
      (sum, line) => sum + line.cost.totalAmount.amount,
      0,
    );
    setOrderTotal(total);
  }, [cartLines]);

  const remaining = Math.max(0, freeShippingLimit - orderTotal);
  const progress = Math.min((orderTotal / freeShippingLimit) * 100, 100);

  console.log("Progress", progress);

  return (
    <>
      <BlockStack
        border="base"
        cornerRadius="base"
        spacing="base"
        padding="base"
      >
        {heading ? (
          <Heading size="medium">{heading}</Heading>
        ) : (
          <Heading size="medium">
            Checkout our Free Shipping Progress Bar
          </Heading>
        )}
        {subheading && <Text>{subheading}</Text>}
        <Progress max={100} value={progress} />
      </BlockStack>
    </>
  );
}
