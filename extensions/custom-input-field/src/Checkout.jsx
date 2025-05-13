import { useState, useCallback } from "react";
import {
  Checkbox,
  TextField,
  useApplyMetafieldsChange,
  reactExtension,
  useAppMetafields,
} from "@shopify/ui-extensions-react/checkout";

reactExtension("purchase.checkout.block.render", () => (
  <DeliveryInstructions />
));
reactExtension("purchase.checkout.shipping-option-list.render-after", () => (
  <DeliveryInstructions />
));

function DeliveryInstructions() {
  const [checked, setChecked] = useState(false);
  const [instructions, setInstructions] = useState("");
  const applyMetafieldsChange = useApplyMetafieldsChange();

  const metafields = useAppMetafields();
  // Extract metafield data
  const planMetafield = metafields.find(
    (metafield) =>
      metafield.target.type === "shop" &&
      metafield.metafield.namespace === "billing" &&
      metafield.metafield.key === "active_plan"
  )?.metafield.value;
  console.log("shopMetafield customInput:", planMetafield); // Add this line to log the metafield value

  // if(!planMetafield == "Plus Plan"){
  //   return null;
  // }

  const handleCheckboxChange = useCallback((value) => {
    setChecked(value);
  }, []);

  const handleTextFieldChange = useCallback(
    (value) => {
      setInstructions(value);
      applyMetafieldsChange({
        type: "updateMetafield",
        namespace: "additional_order_input",
        key: "checkout_beta",
        valueType: "string",
        value,
      });
    },
    [applyMetafieldsChange]
  );

  return (
    <>
      {planMetafield === "Plus Plan" && (
        <>
          <Checkbox
            label="Add delivery instructions"
            checked={checked}
            onChange={handleCheckboxChange}
          >
            Add delivery instructions
          </Checkbox>   
          {checked && (
            <TextField
              label="Delivery Instructions"
              value={instructions}
              onChange={handleTextFieldChange}
            />
          )}
        </>
      )}
    </>
  );
}
