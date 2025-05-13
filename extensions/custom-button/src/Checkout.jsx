import {
  reactExtension,
  InlineStack,
  Button,
  View,
  useSettings,
  useAppMetafields,
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
  () => <Extension />,
);
export { orderDetailsRender };

function Extension() {
  // const applyAttributeChange = useApplyAttributeChange();
  const { buttonText, buttonUrl, buttonAlignment, buttonStyle, buttonKind } = useSettings();
  
  const metafields = useAppMetafields();
  // Extract metafield data
  const planMetafield = metafields.find(
    (metafield) =>
      metafield.target.type === "shop" &&
      metafield.metafield.namespace === "billing" &&
      metafield.metafield.key === "active_plan"
  )?.metafield.value;
  console.log("shopMetafield:", planMetafield); // Add this line to log the metafield value

	if(planMetafield != "Plus Plan"){
    return null; 
  }

  // 3. Render a UI with custom button
  return (
    <InlineStack padding={"base"} inlineAlignment={buttonAlignment || "center"}>
      {/* <Link to={buttonUrl}> */}
      <View maxInlineSize={"140px"} maxBlockSize="1000px">
        <Button to={buttonUrl} kind={buttonKind || "secondary"} appearance={buttonStyle || "monochrome"}>
          {buttonText || "Click me"}
        </Button>
      </View>
      {/* </Link> */}
    </InlineStack>
  );

  // async function handleButtonClick() {
  //   // Track button click in attributes
  //   const result = await applyAttributeChange({
  //     key: "customButtonClicked",
  //     type: "updateAttribute",
  //     value: "yes",
  //   });
  //   console.log("Button clicked, attribute updated:", result);
  // }
}
