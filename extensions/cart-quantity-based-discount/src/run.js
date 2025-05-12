export function run(input) {
  const cart = input.cart;
  const metafield = input.shop.metafield;
  // console.log('metafield:', JSON.parse(metafield.value))
  let discount = 0;

  // Default discount thresholds if metafield parsing fails or isn't provided.
  const parsed = JSON.parse(metafield.value);
  let thresholdHigh = parsed.thresholdHigh;
  let discountHigh = parsed.discountHigh;
  let thresholdLow = parsed.thresholdLow;
  let discountLow = parsed.discountLow;

  // Calculate the total quantity of items in the cart.
  const totalQuantity = cart.lines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  // Apply the discount based on dynamic thresholds.
  if (totalQuantity >= thresholdHigh) {
    discount = discountHigh;
  } else if (totalQuantity >= thresholdLow) {
    discount = discountLow;
  }

  // If no discount is applicable, return an empty discount response.
  if (discount === 0) {
    return { discountApplicationStrategy: "FIRST", discounts: [] };
  }

  // Create a discount object for each cart line.
  const discounts = cart.lines.map((line) => {
    return {
      targets: [
        {
          productVariant: {
            id: line.merchandise.id,
          },
        },
      ],
      value: {
        percentage: {
          value: discount * 100,
        },
      },
      message: `You have received a ${discount * 100}% discount!`,
    };
  });

  // Return the discount strategy and discount details.
  return {
    discountApplicationStrategy: "FIRST",
    discounts: discounts,
  };
}
