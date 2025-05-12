import { json } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Action function to handle form submissions and update Shopify metafields
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  // Extract form data submitted via POST request
  const formData = await request.formData();
  console.log("formData->", formData);

  // Parse individual form fields
  // Get the shop ID and ensure it's properly formatted
  const shopId = formData.get("id");
  if (!shopId) {
    return json({ error: "Shop ID is required" }, { status: 400 });
  }
  const customizeName = formData.get("customizeName");
  const paymentMethod = formData.get("paymentMethod");

  // Extract all conditions dynamically from the submitted form data
  const conditionTypes = formData.getAll("conditionType");
  const greaterSmaller = formData.getAll("greaterSmaller");
  const cartTotals = formData.get("cartTotal");
  const selectedProducts = formData.getAll("selectedProducts");
  const countries = formData.get("country");

  // Initialize arrays for different types of conditions
  const cartTotalConditions = [];
  const productConditions = [];
  const shippingCountryConditions = [];

  // Check for duplicate conditions
  const uniqueConditions = new Set(conditionTypes);
  if (uniqueConditions.size !== conditionTypes.length) {
    return json(
      {
        error: "Duplicate conditions are not allowed",
        userErrors: [
          {
            field: "conditions",
            message: "Each condition type must be unique",
          },
        ],
      },
      { status: 400 },
    );
  }

  // Categorize conditions based on their type
  for (let i = 0; i < conditionTypes.length; i++) {
    const conditionType = conditionTypes[i];
    const greaterOrSmall = greaterSmaller[i];
    const amount = Number(cartTotals) || 0;
    const products = selectedProducts[i] ? selectedProducts[i].split(",") : [];
    const country = countries;

    // Assign conditions to respective categories
    switch (conditionType) {
      case "product":
        productConditions.push({
          greaterOrSmall,
          products,
        });
        break;
      case "cart_total":
        cartTotalConditions.push({
          greaterOrSmall,
          amount,
        });
        break;
      case "shipping_country":
        shippingCountryConditions.push({
          greaterOrSmall,
          country,
        });
        break;
      default:
        console.warn(`Unknown condition type: ${conditionType}`);
        break;
    }
  }

  // Construct the configuration object with categorized conditions
  const config = JSON.stringify({
    shopId: shopId,
    customizeName: customizeName,
    paymentMethod: paymentMethod,
    conditions: {
      cartTotal: cartTotalConditions,
      products: productConditions,
      shippingCountry: shippingCountryConditions,
    },
  });

  const configJson = {
    shopId: shopId,
    customizeName: customizeName,
    paymentMethod: paymentMethod,
    conditions: {
      cartTotal: cartTotalConditions,
      products: productConditions,
      shippingCountry: shippingCountryConditions,
    },
  };

  console.log("configJson:", configJson);
  console.log("condition.products:", configJson.conditions.products);

  try {
    // --- Save Metafield (Set will Create or Update) ---
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
              key: "hide_payment",
              namespace: "cart",
              ownerId: shopId,
              type: "json",
              value: JSON.stringify(configJson),
            },
          ],
        },
      },
    );
    const data = await response.json();
    // --- End Metafield ---

    // --- Fetch & Execute Shopify Functions ---
    // --- Fetch Shopify Functions ---
    const functionResponse = await admin.graphql(
      `query {
            shopifyFunctions(first: 50) {
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
    // console.log("Functions Found:", functions); // Log found payment functions

    if (!functions) {
      console.error("Could not fetch Shopify Payment Functions.");
      return json(
        { errors: ["Could not fetch required Shopify functions."] },
        { status: 500 },
      );
    }

    // Find the specific function by title
    const targetFunctionName = "hide_payment-method-cartTotal"; // Make sure this matches your deployed function title
    const hidePaymentFunction = functions.find(
      (func) => func.title === targetFunctionName,
    );

    if (!hidePaymentFunction) {
      console.error(`Function '${targetFunctionName}' not found.`);
      return json(
        {
          errors: [
            `The required Shopify function '${targetFunctionName}' was not found or is not deployed.`,
          ],
        },
        { status: 500 },
      );
    }

    const functionId = hidePaymentFunction.id;
    console.log(
      `Found function '${targetFunctionName}' with ID: ${functionId}`,
    );

    // --- Check for Existing Payment Customization ---
    const existingCustomizationResponse = await admin.graphql(
      `#graphql
        query existingPaymentCustomizations($query: String!) {
          paymentCustomizations(first: 1, query: $query) {
            edges {
              node {
                id
                title
                enabled
              }
            }
          }
        }`,
      {
        variables: {
          query: `title:'${customizeName}'`, // Filter by the exact title
        },
      },
    );

    const existingCustomizationData =
      await existingCustomizationResponse.json();
    const existingCustomizationNode =
      existingCustomizationData.data?.paymentCustomizations?.edges[0]?.node;

    let customizationMutation;
    let customizationVariables;

    if (existingCustomizationNode) {
      // --- Update Existing Payment Customization ---
      console.log(
        `Found existing Payment Customization, ID: ${existingCustomizationNode.id}. Updating...`,
      );
      customizationMutation = `#graphql
          mutation PaymentCustomizationUpdate($id: ID!, $paymentCustomization: PaymentCustomizationInput!) {
            paymentCustomizationUpdate(id: $id, paymentCustomization: $paymentCustomization) {
              paymentCustomization {
                id
              }
              userErrors {
                field
                message
              }
            }
          }`;
      customizationVariables = {
        id: existingCustomizationNode.id,
        paymentCustomization: {
          title: customizeName, // Can update title if needed, but usually keep it
          enabled: true, // Ensure it's enabled
          functionId: functionId, // Can update functionId if necessary
        },
      };
    } else {
      // --- Create New Payment Customization ---
      console.log(
        `No existing Payment Customization found for '${customizeName}'. Creating new...`,
      );
      customizationMutation = `#graphql
          mutation PaymentCustomizationCreate($paymentCustomization: PaymentCustomizationInput!) {
            paymentCustomizationCreate(paymentCustomization: $paymentCustomization) {
              paymentCustomization {
                id
              }
              userErrors {
                field
                message
              }
            }
          }`;
      customizationVariables = {
        paymentCustomization: {
          title: customizeName,
          enabled: true,
          functionId: functionId,
        },
      };
    }

    // --- Execute Create or Update Mutation ---
    const paymentCustomizationResponse = await admin.graphql(
      customizationMutation,
      { variables: customizationVariables },
    );

    const customizationResult = await paymentCustomizationResponse.json();
    const mutationResultPath = existingCustomizationNode
      ? customizationResult.data?.paymentCustomizationUpdate
      : customizationResult.data?.paymentCustomizationCreate;

    if (mutationResultPath?.userErrors?.length > 0) {
      console.error(
        "Payment Customization operation errors:",
        mutationResultPath.userErrors,
      );
      return json(
        { errors: mutationResultPath.userErrors.map((e) => e.message) },
        { status: 400 },
      );
    } else if (mutationResultPath?.paymentCustomization?.id) {
      console.log(
        `Successfully ${existingCustomizationNode ? "updated" : "created"} Payment Customization:`,
        mutationResultPath.paymentCustomization.id,
      );
    } else {
      console.error(
        "Failed to create/update Payment Customization:",
        customizationResult,
      );
      return json(
        { errors: ["Failed to activate the payment customization function."] },
        { status: 500 },
      );
    }
    // --- End Customization Create/Update ---
    // --- Fetch & Execute Shopify Functions Ends ---

    // --- Save/Update Prisma Record ---
    const existingDbRecord = await prisma.paymentHide.findFirst({
      where: {
        shopId: shopId,
        customizeName: customizeName,
      },
    });

    let dbOperation;
    if (existingDbRecord) {
      console.log(`Updating existing DB record for: ${customizeName}`);
      dbOperation = prisma.paymentHide.update({
        where: { id: existingDbRecord.id },
        data: {
          paymentMethod: paymentMethod,
          conditions: configJson.conditions, // Update conditions
          status: "active", // Or manage status as needed
        },
      });
    } else {
      console.log(`Creating new DB record for: ${customizeName}`);
      dbOperation = prisma.paymentHide.create({
        data: {
          shopId: shopId,
          customizeName: customizeName,
          paymentMethod: paymentMethod,
          conditions: configJson.conditions,
          status: "active",
        },
      });
    }
    const dbResult = await dbOperation;
    console.log("Prisma operation successful:", dbResult);
    // --- End Prisma ---

    // Return success if all operations were successful
    return json({
      success: true,
        message: `Payment hiding rule '${customizeName}' ${existingDbRecord ? "updated" : "created"} successfully.`,
    });
  } catch (error) {
    console.error("Error in action function:", error);
    // Handle errors by returning an error response
    return json(
      { errors: [error.message || "An unexpected error occurred."] },   
      { status: 500 },
    );
  }
}
