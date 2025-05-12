// app/hide-shipping-method
import { json } from "@remix-run/node"; // Import json and redirect
import { authenticate } from "../shopify.server"; // Assuming authenticate utility
import prisma from "../db.server"; // Assuming prisma client path

// Server-side Action Function
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request); // Authenticate
  const formData = await request.formData();

  const customizeName = formData.get("customizeName");
  const shippingMethod = formData.get("shippingMethod");
  const conditionsString = formData.get("conditions");
  // Retrieve shopGid passed from the fetcher
  const shopGid = formData.get("shopGid");
  const id = formData.get("id"); // Get ID if it exists

  let conditions = [];

  try {
    conditions = JSON.parse(conditionsString);
  } catch (e) {
    return json({ errors: ["Invalid conditions format."] }, { status: 400 });
  }

  // --- Server-side Validation (Essential for security) ---
  const errors = [];
  if (
    !shopGid ||
    typeof shopGid !== "string" ||
    !shopGid.startsWith("gid://shopify/Shop/")
  ) {
    errors.push("Invalid Shop Identifier provided.");
  }
  if (
    !customizeName ||
    typeof customizeName !== "string" ||
    !customizeName.trim()
  ) {
    errors.push("Customization name is required");
  }
  if (
    !shippingMethod ||
    typeof shippingMethod !== "string" ||
    !shippingMethod.trim()
  ) {
    errors.push("Shipping method is required");
  }
  if (!Array.isArray(conditions) || conditions.length === 0) {
    errors.push("At least one condition is required.");
  } else {
    // Add more specific condition validation if needed (e.g., check structure, values)
    const uniqueTypes = ["cart_total", "customer_type", "shipping_country"];
    const typeCount = {};
    const conditionMap = new Map();

    conditions.forEach((condition, index) => {
      // Validate structure
      if (
        !condition ||
        typeof condition !== "object" ||
        !condition.type ||
        !condition.operator ||
        condition.value === undefined ||
        condition.value === null
      ) {
        errors.push(`Invalid structure for condition ${index + 1}`);
        return; // Skip further checks for this invalid condition
      }

      // Check unique types
      if (uniqueTypes.includes(condition.type)) {
        typeCount[condition.type] = (typeCount[condition.type] || 0) + 1;
        if (typeCount[condition.type] > 1) {
          errors.push(
            `Only one ${condition.type.replace("_", " ")} condition is allowed`,
          );
        }
      }

      // Check duplicates
      const key = `${condition.type}-${condition.operator}-${condition.value}`;
      if (condition.value !== "" && conditionMap.has(key)) {
        // Only check non-empty duplicates
        errors.push(
          `Duplicate condition found: ${condition.type} ${condition.operator} ${condition.value}`,
        );
      } else if (condition.value !== "") {
        conditionMap.set(key, true);
      }

      // Check required value
      if (condition.value === "") {
        errors.push(
          `Value is required for condition ${index + 1} (${condition.type})`,
        );
      }
      // Check cart total > 0
      if (
        condition.type === "cart_total" &&
        (isNaN(parseFloat(condition.value)) || parseFloat(condition.value) <= 0)
      ) {
        errors.push(
          `Cart total for condition ${index + 1} must be a number greater than 0`,
        );
      }
    });
  }
  // --- End Server-side Validation ---

  if (errors.length > 0) {
    // Return validation errors to the client
    return json({ errors }, { status: 400 });
  }

  try {
    // --- Update existing customization if id is available ---
    if (id) {
      // Update existing customization
      const existingCustomization =
        await prisma.shippingCustomization.findUnique({
          where: { id: id },
        });

      if (!existingCustomization) {
        return json({ errors: ["Customization not found"] }, { status: 404 });
      }

      // Update Prisma record
      await prisma.shippingCustomization.update({
        where: { id: id },
        data: {
          name: customizeName,
          shippingMethodToHide: shippingMethod,
          conditions: conditions,
        },
      });

      // Update Shopify metafield
      const metaConfig = {
        shop: shopGid,
        type: "Hide Shipping",
        customizeName: customizeName,
        shippingMethodToHide: shippingMethod,
        conditions: conditions,
      };

      await admin.graphql(
        `#graphql
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
                createdAt
                updatedAt
              }
              userErrors {
                field
                message
                code
              }
            }
          }`,
        {
          variables: {
            metafields: [
              {
                key: "hide_shipping",
                namespace: "method",
                ownerId: shopGid,
                type: "json",
                value: JSON.stringify(metaConfig),
              },
            ],
          },
        },
      );

      return json({
        success: true,
        message: "Customization updated successfully.",
      });
    }

    // Else create a new one
    // --- Check for existing customization with the same name ---
    const existingCustomization = await prisma.shippingCustomization.findFirst({
      where: {
        shop: shopGid,
        name: customizeName,
      },
    });

    if (existingCustomization) {
      // If found, return an error instead of creating a new one
      return json(
        {
          errors: [`A customization named "${customizeName}" already exists.`],
        },
        { status: 400 }, // Use 400 Bad Request or 409 Conflict
      );
    }
    // --- End Check ---

    /// --- Save to Shopify Shop Metafeild ---
    // Send a GraphQL mutation to update Shopify metafields with the configuration
    const metaConfig = {
      shop: shopGid,
      type: "Hide Shipping",
      customizeName: customizeName,
      shippingMethodToHide: shippingMethod,
      conditions: conditions,
    };
    const response = await admin.graphql(
      `#graphql
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              key
              namespace
              value
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
              code
            }
          }
        }`,
      {
        variables: {
          metafields: [
            {
              key: "hide_shipping",
              namespace: "method",
              ownerId: shopGid,
              type: "json",
              value: JSON.stringify(metaConfig),
            },
          ],
        },
      },
    );

    const data = await response.json();
    //  --- End Save to Shopify Shop Metafeild ---

    // --- Fetch & Execute Shopify Functions ---
    const functionResponse = await admin.graphql(
      `query {
          shopifyFunctions(first: 25) {
            nodes {
              id
              title
              apiType
              app {
                title
              }
            }
          }
        }`,
    );

    const shopifyFunctionsData = await functionResponse.json();
    const functions = shopifyFunctionsData.data?.shopifyFunctions?.nodes;
    console.log("function", functions);
    if (!functions) {
      console.error("Could not fetch Shopify Functions.");
      // Decide how to handle this - maybe proceed without creating the customization?
      // Or return an error. For now, just log it.
    } else {
      // Find the specific function by title
      const hideShippingFunction = functions.find(
        (func) => func.title === "hide-shipping-method",
      );

      if (hideShippingFunction) {
        const functionId = hideShippingFunction.id;
        console.log(
          `Found function 'hide-shipping-method' with ID: ${functionId}`,
        );

        // --- Create Delivery Customization using the Function ---
        const deliveryCustomizationMutation = await admin.graphql(
          `#graphql
            mutation DeliveryCustomizationCreate($deliveryCustomization: DeliveryCustomizationInput!) {
              deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
                deliveryCustomization {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              deliveryCustomization: {
                title: customizeName, // Use the name from the form
                enabled: true,
                functionId: functionId,
              },
            },
          },
        );

        const customizationResult = await deliveryCustomizationMutation.json();

        if (
          customizationResult.data?.deliveryCustomizationCreate?.userErrors
            ?.length > 0
        ) {
          console.error(
            "Delivery Customization creation errors:",
            customizationResult.data.deliveryCustomizationCreate.userErrors,
          );
          // Return these errors to the user
          return json(
            {
              errors:
                customizationResult.data.deliveryCustomizationCreate.userErrors.map(
                  (e) => e.message,
                ),
            },
            { status: 400 },
          );
        } else if (
          customizationResult.data?.deliveryCustomizationCreate
            ?.deliveryCustomization
        ) {
          console.log(
            "Successfully created Delivery Customization:",
            customizationResult.data.deliveryCustomizationCreate
              .deliveryCustomization.id,
          );
        } else {
          console.error(
            "Failed to create Delivery Customization:",
            customizationResult,
          );
          // Return a generic error
          return json(
            {
              errors: [
                "Failed to activate the shipping customization function.",
              ],
            },
            { status: 500 },
          );
        }
        // --- End Create Delivery Customization ---
      } else {
        console.warn(
          "Function 'hide-shipping-method' not found. Skipping customization creation.",
        );
        // Optionally inform the user that the function needs to be deployed/available
        // return json({ errors: ["The required 'hide-shipping-method' function was not found."] }, { status: 500 });
      }
    }
    // --- Fetch & Execute Shopify Functions Ends ---

    /// --- Save to Prisma Database ---
    const prismaResponse = await prisma.shippingCustomization.create({
      data: {
        // Use the shopGid received from the form data
        shop: shopGid,
        type: "Hide Shipping",
        name: customizeName,
        shippingMethodToHide: shippingMethod,
        conditions: conditions,
      },
    });
    // --- End Save to Prisma ---

    console.log("Prisma data saved successfull");
    console.log("Shopify meta data saved successfuly");

    // Return success JSON instead of redirecting for fetcher
    return json({ success: true, message: "Settings saved successfully." });
  } catch (error) {
    console.error("Failed to save customization:", error);
    // Return a generic error message, including potential GraphQL errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to save settings. Please try again.";
    return json({ errors: [errorMessage] }, { status: 500 });
  }
}
