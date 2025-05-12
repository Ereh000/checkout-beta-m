// @ts-check

// JSDoc types
/**
 * @typedef {import("../generated/api").RunInput} RunInput  // Input data for run function
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult // Output data for run function
 */

/**
 * @type {FunctionRunResult} // Default return: no changes
 */
const NO_CHANGES = {
  operations: [], // No operations
};

// Entrypoint for 'purchase.payment-customization.run' extension
/**
 * @param {RunInput} input // Function input
 * @returns {FunctionRunResult} // Function output
 */

// metafields response example value ----------
// configJson: {
//   shopId: 'gid://shopify/Shop/74655760623',
//   customizeName: 'New Name',
//   paymentMethod: 'Cash On Delivery',
//   condition: {
//     cartTotal: [ { greaterOrSmall: 'greater_than', amount: 0 } ],
//     products: [ { greaterOrSmall: 'is', products: [Array] } ],
//     shippingCountry: [ { greaterOrSmall: 'is', country: 'in' } ]
//   }
// }

export function run(input) {
  const cart = input.cart; // Cart data
  const metafield = input.shop.metafield; // Shop metafield

  // Return if no metafield
  if (!metafield?.value) {
    return NO_CHANGES; // No changes if no metafield
  }

  try {
    const parsed = JSON.parse(metafield.value);  // Parse metafield value
    // console.log("metafield", parsed); // Log metafield

    // Extract configuration from metafield
    const conditions = parsed.conditions || {}; // Get conditions, default {} -  Gets the conditions for payment customization from the metafield data.  If no conditions are present, it defaults to an empty object.
    const paymentMethod = parsed.paymentMethod;  // Get payment method

    // Default conditions
    const metaCartTotal = conditions.cartTotal?.[0] || {};  // Default cart total
    const metaProducts = conditions.products?.[0] || {};    // Default products
    const metaShippingCountry = conditions.shippingCountry?.[0] || {}; // Default shipping country

    // Config values from metafield
    const MIN_CART_TOTAL =
      metaCartTotal.amount && parseFloat(metaCartTotal.amount); // Min cart total
    const cartTotalComparison = metaCartTotal.greaterOrSmall || "greater_than"; // Cart total comparison

    // const EXCLUDED_PRODUCT_IDS = [
    //   "gid://shopify/ProductVariant/46322014617839",
    //   "gid://shopify/ProductVariant/46322014617839",
    // ];
    // Use product IDs from the metafield configuration
    const EXCLUDED_PRODUCT_IDS = metaProducts.products || []; // Default to empty array if not provided
    console.log("EXCLUDED_PRODUCT_IDS", EXCLUDED_PRODUCT_IDS); // Log excluded product
    const productsComparison = metaProducts.greaterOrSmall || "is";  // Product comparison

    const EXCLUDED_COUNTRIES = metaShippingCountry.country
      ? [metaShippingCountry.country]
      : []; // Excluded countries
    const countryComparison = metaShippingCountry.greaterOrSmall || "is"; // Country comparison

    // Get cart total
    const cartTotal = parseFloat(input.cart.cost.totalAmount.amount ?? "0.0"); // Get cart total, default 0.0

    // Condition 1: Cart total check
    let totalCondition = false;
    if (cartTotalComparison === "greater_than") {
      totalCondition = cartTotal <= MIN_CART_TOTAL; // Check if cart total <= min
    } else if (cartTotalComparison === "less_than") {
      totalCondition = cartTotal >= MIN_CART_TOTAL; // Check if cart total >= min
    }

    // Condition 2: Products check
    let productCondition = false;
    if (productsComparison === "is") {
      productCondition = input.cart.lines
        .filter((line) => line.merchandise.__typename === "ProductVariant") // Filter to product variants
        .map((line) => ({
          // Access the parent product ID
          productId: line.merchandise.product.id,
        }))
        // Check if any cart line's product ID is in the excluded list
        .some((line) => EXCLUDED_PRODUCT_IDS.includes(line.productId));

      // Optional: Keep logging for debugging if needed
      const cartLineProductIds = input.cart.lines
        .filter((line) => line.merchandise.__typename === "ProductVariant") // Filter to product variants
        .map((line) => {
          console.log(`Product ID: ${line.merchandise.product.id}`);
          return line.merchandise.id; // Return line
        })
      console.log("cartLineId is", cartLineProductIds); // Log product condition
    } else if (productsComparison === "is_not") {
      productCondition = !input.cart.lines
        .filter((line) => line.merchandise.__typename === "ProductVariant")
        // Ensure we are accessing the correct ID property here as well
        .some((line) => EXCLUDED_PRODUCT_IDS.includes(line.merchandise.id));
    }

    // Condition 3: Shipping country check
    let countryCondition = false;
    if (countryComparison === "is") {
      countryCondition = cart.deliveryGroups.some( // Iterate delivery groups
        (group) =>
          group.deliveryAddress?.countryCode &&
          EXCLUDED_COUNTRIES.includes(group.deliveryAddress.countryCode), // Check if excluded country
      );
    } else if (countryComparison === "is_not") {
      countryCondition = !cart.deliveryGroups.some(
        (group) =>
          group.deliveryAddress?.countryCode &&
          EXCLUDED_COUNTRIES.includes(group.deliveryAddress.countryCode),
      );
    }
    console.log(
      "Conditions:",
      "totalCondition",
      totalCondition,
      "productCondition",
      productCondition,
      "countryCondition",
      countryCondition,
      "MIN_CART_TOTAL",
      MIN_CART_TOTAL,
      "paymentMethod",
      paymentMethod,
    );

    const shouldHideCOD =
      totalCondition || countryCondition || productCondition; // Hide COD if any condition met

    if (!shouldHideCOD) {
      console.log("No conditions met to hide the payment method.");
      return NO_CHANGES; // No changes if no conditions met
    }

    // Find payment method to hide
    const hidePaymentMethod = input.paymentMethods.find((method) =>
      method.name.includes("Cash on Delivery"), // Find COD method
    );

    if (!hidePaymentMethod) {
      return NO_CHANGES; // No changes if COD not found
    }


    return {
      operations: [ // Return operations
        {
          hide: {  // Hide operation
            paymentMethodId: hidePaymentMethod.id, // COD method ID
          },
        },
      ],
    };

  } catch (error) { // Catch errors
    console.error("Error while create Hide Payment Method"); // Log error
    return NO_CHANGES; // Return no changes on error
  }
}
