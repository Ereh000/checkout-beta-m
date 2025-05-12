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
export function run(input) {
  const metafield = input.shop.metafield;
  const parsed = JSON.parse(metafield.value);
  const newName = parsed.newName;
  const paymentMethod = parsed.paymentMethod;

  console.log("paymentMethod:", input.paymentMethods);
  // console.log("newName:", newName);

  // Map over payment methods and modify their names
  const updatedMethods = input.paymentMethods.map((method) => {
    // Example: Rename "Cash On Delivery" to "Cash On Delivery 20%"
    if (method.name === paymentMethod) {
      console.log("method->", method.name);
      return {
        ...method,
        name: newName,
      };
    }
    return method;
  });

  // Return the updated payment methods
  return {
    operations: updatedMethods.map((method) => ({
      rename: {
        paymentMethodId: method.id,
        name: method.name,
      },
    })),
  };
}
