import {
  reactExtension,
  Text,
  useSettings,
  useAppMetafields,
} from "@shopify/ui-extensions-react/checkout";

reactExtension("purchase.checkout.cart-line-item.render-after", () => (
  <Extension />
));

export default function Extension() {
  const { message_text, text_tone } = useSettings();
  const metafields = useAppMetafields();
  // Extract metafield data
  const planMetafield = metafields.find(
    (metafield) =>
      metafield.target.type === "shop" &&
      metafield.metafield.namespace === "billing" &&
      metafield.metafield.key === "active_plan"
  )?.metafield.value;

  if(planMetafield !== "Plus Plan"){
    return null; 
  }


  const tone = text_tone ?? "critical";

  return (
    <>
      {message_text ? (
        <Text appearance={tone} size="extraSmall">{message_text}</Text>
      ) : (
        <Text appearance={tone} size="extraSmall">20% Off on Today Deal</Text>
      )}
    </>
  );
}
