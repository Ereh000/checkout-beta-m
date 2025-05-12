// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

// ---------------- This is Metafield Value Response --------------------------------------
// "metafield": {
// value:
// '{"shop":"gid://shopify/Shop/74655760623",
// "customizeName":"Hide Standard Shipping",
// "shippingMethodToHide":"Standard",
// "conditions":[
//    {"type":"cart_total","operator":"greater_than", "value":"1000"},
//    {"type":"customer_tag","operator":"is_not","value":"VIP"},
//    {"type":"customer_type","operator":"greater_than","value":"B2C"},
//    {"type":"shipping_country","operator":"greater_than","value":"FR"},
//    {"type":"product_tag","operator":"greater_than","value":"Sale"}]}',
// ]
// }

// Helper function to evaluate a single condition
/**
 * @param {object} condition
 * @param {RunInput['cart']} cart
 * @returns {boolean}
 */
function evaluateCondition(condition, cart) {
  const { type, operator, value } = condition;
  const buyer = cart.buyerIdentity?.customer;
  const deliveryAddress = cart.deliveryGroups?.[0]?.deliveryAddress; // Assuming single delivery group

  switch (type) {
    case "cart_total": {
      const cartTotal = parseFloat(cart.cost?.totalAmount?.amount ?? "0");
      const conditionValue = parseFloat(value);
      if (isNaN(cartTotal) || isNaN(conditionValue)) return false;
      if (operator === "greater_than") return cartTotal > conditionValue;
      if (operator === "less_than") return cartTotal < conditionValue;
      return false; // Unsupported operator for cart_total
    }
    case "customer_tag": {
      if (!buyer?.hasTags) return false; // No customer or no tags
      const hasTag = buyer.hasTags.some((tagInfo) => tagInfo.tag === value);
      if (operator === "is") return hasTag;
      if (operator === "is_not") return !hasTag;
      return false;
    }
    case "customer_type": {
      // NOTE: 'customer_type' (B2B/B2C) isn't directly available.
      // This example assumes it might be represented by a customer tag.
      // Adjust if you store this differently (e.g., customer metafield).
      if (!buyer?.hasTags) return false;
      const hasTypeTag = buyer.hasTags.some((tagInfo) => tagInfo.tag === value); // e.g., value is "B2B" or "B2C"
      if (operator === "is") return hasTypeTag;
      if (operator === "is_not") return !hasTypeTag;
      return false;
    }
    case "shipping_country": {
      const countryCode = deliveryAddress?.countryCode;
      if (!countryCode) return false;
      if (operator === "is") return countryCode === value;
      if (operator === "is_not") return countryCode !== value;
      return false;
    }
    case "product_tag": {
      if (!cart.lines || cart.lines.length === 0) return false;
      const productHasTag = cart.lines.some((line) =>
        line.merchandise?.product?.hasTags?.some(
          (tagInfo) => tagInfo.tag === value,
        ),
      );
      if (operator === "is") return productHasTag;
      if (operator === "is_not") return !productHasTag;
      return false;
    }
    default:
      return false; // Unknown condition type
  }
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // --- Get Configuration from Metafield ---
  const metafieldValue = input.shop.metafield?.value;
  if (!metafieldValue) {
    console.error("Error: Metafield value is missing.");
    return NO_CHANGES;
  }

  let config;
  try {
    config = JSON.parse(metafieldValue);
  } catch (e) {
    console.error("Error parsing metafield JSON:", e);
    return NO_CHANGES;
  }

  const { shippingMethodToHide, conditions, message } = config;

  if (
    !shippingMethodToHide ||
    typeof shippingMethodToHide !== "string" ||
    !conditions ||
    !Array.isArray(conditions)
  ) {
    console.error("Error: Invalid configuration structure in metafield.");
    return NO_CHANGES;
  }
  // --- End Configuration ---

  // --- Evaluate Conditions ---
  let shouldHide = false;
  for (const condition of conditions) {
    if (evaluateCondition(condition, input.cart)) {
      shouldHide = true;
      console.log(
        `Condition met: ${JSON.stringify(condition)}. Hiding method.`,
        `Message: ${message}`
      );
      break; // Exit loop early if any condition matches
    }
  }
  // --- End Evaluation ---

  // --- Generate Operations if needed ---
  if (shouldHide) {
      // const message = "Updated Shipping Method Name";

    const operations = input.cart.deliveryGroups.flatMap((group) =>
      group.deliveryOptions
        // Find the option matching the name from the config
        .filter((option) => option.title === shippingMethodToHide)
        .map((option) => ({
          rename: {
            deliveryOptionHandle: option.handle,
            title: `${option.title} - ${message}`,
          },
        })),
    );

    if (operations.length > 0) {
      console.log(`Hiding delivery option: ${shippingMethodToHide}`);
      return { operations };
    } else {
      console.log(
        `Condition met, but shipping method "${shippingMethodToHide}" not found in delivery options.`,
      );
      return NO_CHANGES;
    }
  }
  // --- End Generate Operations ---

  // If no conditions were met, return no changes
  console.log("No conditions met. No changes applied.");
  return NO_CHANGES;
}

// export function run(input) {
//   const message = "Updated Shipping Method Name";

//   const toRename = input.cart.deliveryGroups
//     .flatMap((group) => group.deliveryOptions)
//     .filter((option) => option.title === "Standard") // Replace with the method to rename
//     .map((option) => ({
//       rename: {
//         deliveryOptionHandle: option.handle,
//         title: `${option.title} - ${message}`,
//       },
//     }));

//   return {
//     operations: toRename,
//   };
// }
