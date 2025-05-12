import {
  reactExtension,
  Banner,
  // BlockStack,
  // Text,
  useSettings,
  // useTranslate,
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
  // Use the merchant-defined settings to retrieve the extension's content
  const {
    title: merchantTitle,
    description: description,
    collapsible,
    status: merchantStatus,
  } = useSettings();

  // Set a default status for the banner if a merchant didn't configure the banner in the checkout editor
  const status = merchantStatus ?? "success";
  const title = merchantTitle ?? "📦 Collect Delivery Instructions";
  const blockDescription =
    description ?? "Below is an example of our delivery instructions as well as our optional 'Authority to leave' checkbox";

  // Render the banner
  return (  
    <Banner title={title} status={status} collapsible={collapsible}>
      {blockDescription}
    </Banner>  
  );
}

// function Extension() {
//   const { banner_title, banner_message, show_icon } = useSettings();
//   return (
//     <BlockStack padding="base">
//       <Banner
//         status="info"
//         title={banner_title || "With Checkout Plus You Can Add Custom Messages"}
//         icon={show_icon !== 0 ? "info" : undefined}
//       >
//         <BlockStack spacing="tight">
//           {banner_message ? (
//             <Text>
//               {banner_message}
//             </Text>
//           ) : <Text>
//             Communicate important information to your customers and even include dynamic
//             content like the total $1.00 or even add 👉
//           </Text>}
//         </BlockStack>
//       </Banner>
//     </BlockStack>
//   );
// }
