// app/additional -> hide-shipping-method

import {
  Card,
  Grid,
  Icon,
  LegacyCard,
  Page,
  TextField,
  Autocomplete,
  Text,
  Select,
  Button,
  Banner,
} from "@shopify/polaris";
import React, { useCallback, useMemo, useState } from "react";
import { SearchIcon, DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import "./assets/output.css";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node"; // Import json and redirect
import { authenticate, PLUS_PLAN, PLUS_PLAN_YEARLY } from "../shopify.server"; // Assuming authenticate utility
import prisma from "../db.server"; // Assuming prisma client path

// --- Loader Function ---
export async function loader({ request }) {
  const { admin, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  console.log("id", id);

  // Check if the shop is plus and has an active payment
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [PLUS_PLAN, PLUS_PLAN_YEARLY],
    isTest: true,
  });

  const shopResponse = await admin.graphql(`
      query {
        shop {
          id
          plan {
            displayName
            partnerDevelopment
            shopifyPlus
          }
        }
      }
    `);
  const shopData = await shopResponse.json();
  const shopPlan = shopData.data?.shop?.plan;
  console.log("shop plan", shopPlan);
  // Check if the shop is plus and has an active payment ends ---

  // Fetch Shop GraphQL ID in the loader
  const shopIdResponse = await admin.graphql(
    `#graphql
      query shopInfo {
        shop {
          id
        }
      }`,
  );
  if (!shopIdResponse.ok) {
    console.error(
      "Failed to fetch shop ID in loader:",
      await shopIdResponse.text(),
    );
    // Handle error appropriately, maybe throw an error or return a specific state
    throw new Response("Could not retrieve shop identifier.", { status: 500 });
  }

  const shopIdData = await shopIdResponse.json();
  const shopGid = shopIdData.data?.shop?.id;

  if (!shopGid) {
    console.error("Shop ID not found in loader GraphQL response:", shopIdData);
    throw new Response("Could not retrieve shop identifier.", { status: 500 });
  }

  // If ID is provided, fetch existing customization
  let existingCustomization = null;
  if (id) {
    existingCustomization = await prisma.shippingMessage.findUnique({
      where: { id: id },
    });
    if (!existingCustomization) {
      throw new Response("Customization not found", { status: 404 });
    }
  }

  // Return the shopGid
  return json({ shopGid, existingCustomization, shopPlan, hasActivePayment });
}
// --- End Loader Function ---

// Server-side Action Function
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request); // Authenticate
  const formData = await request.formData();

  const customizeName = formData.get("customizeName");
  const shippingMethod = formData.get("shippingMethod");
  const message = formData.get("message");
  const conditionsString = formData.get("conditions");
  // Retrieve shopGid passed from the fetcher
  const shopGid = formData.get("shopGid");
  const id = formData.get("id");

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
  if (!message || typeof message !== "string" || !customizeName.trim()) {
    errors.push("Message is required");
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
    // --- Id id there then Update existing customization ---
    if (id) {
      // Update existing customization
      const updatedCustomization = await prisma.shippingMessage.update({
        where: { id: id },
        data: {
          name: customizeName,
          shippingMethodToHide: shippingMethod,
          message: message,
          conditions: conditions,
        },
      });

      // Update Shopify metafield
      const metaConfig = {
        shop: shopGid,
        type: "Rename Shipping Method",
        customizeName: customizeName,
        shippingMethodToHide: shippingMethod,
        message: message,
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
                key: "rename_shipping",
                namespace: "method",
                ownerId: shopGid,
                type: "json",
                value: JSON.stringify(metaConfig),
              },
            ],
          },
        },
      );

      console.log("Rename Shipping Method updated successfully.");
      return json({
        success: true,
        message: "Customization updated successfully.",
      });
    }

    // --- Else Create new customization ---

    // --- Check for existing customization with the same name ---
    const existingCustomization = await prisma.shippingMessage.findFirst({
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
      type: "Rename Shipping Method",
      customizeName: customizeName,
      shippingMethodToHide: shippingMethod,
      message: message, // Add message field
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
              key: "rename_shipping",
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
            shopifyFunctions(first: 30) {
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
        (func) => func.title === "add-message-to-shipping-method",
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
    const prismaResponse = await prisma.shippingMessage.create({
      data: {
        // Use the shopGid received from the form data
        shop: shopGid,
        type: "Rename Shipping",
        name: customizeName,
        shippingMethodToHide: shippingMethod,
        message: message,
        conditions: conditions,
      },
    });
    // --- End Save to Prisma ---

    console.log("Prisma saved success", prismaResponse);
    console.log(
      "Shopify meta saved success",
      data.data.metafieldsSet.metafields,
    );

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

export default function MainHideShippingMethod() {
  // Get shopGid from loader data
  const { shopGid, existingCustomization, shopPlan, hasActivePayment } =
    useLoaderData();
  console.log("existingCustomization", existingCustomization);
  // Initialize fetcher
  const fetcher = useFetcher();
  // Use fetcher.state for loading status
  const isSubmitting = fetcher.state !== "idle";
  const [customizeName, setCustomizeName] = useState(
    existingCustomization?.name || "",
  );
  const [shippingMethod, setShippingMethod] = useState(
    existingCustomization?.shippingMethodToHide || "",
  );
  const [message, setMessage] = useState(existingCustomization?.message || "");
  const [conditions, setConditions] = useState([
    {
      type: "cart_total",
      operator: "greater_than",
      value: "",
    },
  ]);
  const [alertMessage, setAlertMessage] = useState(null);

  // console.log("message", message);

  const validateForm = () => {
    const errors = [];

    if (!customizeName.trim()) {
      errors.push("Customization name is required");
    }

    if (!shippingMethod.trim()) {
      errors.push("Shipping method is required");
    }

    if (!message.trim()) {
      errors.push("Message is required");
    }

    // Check for duplicate condition types
    const uniqueTypes = ["cart_total", "customer_type", "shipping_country"];
    const typeCount = {};
    conditions.forEach((condition) => {
      if (uniqueTypes.includes(condition.type)) {
        typeCount[condition.type] = (typeCount[condition.type] || 0) + 1;
        if (typeCount[condition.type] > 1) {
          errors.push(
            `Only one ${condition.type.replace("_", " ")} condition is allowed`,
          );
        }
      }
    });

    // Check for duplicate conditions
    const conditionMap = new Map();
    conditions.forEach((condition, index) => {
      const key = `${condition.type}-${condition.operator}-${condition.value}`;
      if (conditionMap.has(key)) {
        errors.push(`Duplicate condition found at position ${index + 1}`);
      } else {
        conditionMap.set(key, true);
      }

      if (!condition.value) {
        errors.push(`Value is required for condition ${index + 1}`);
      }
      if (condition.type === "cart_total" && parseFloat(condition.value) <= 0) {
        errors.push("Cart total must be greater than 0");
      }
    });

    return errors;
  };

  // --- Handle Fetcher Submission ---
  const handleSaveWithFetcher = () => {
    // Optional: Run client-side validation first
    const clientErrors = validateForm();
    if (clientErrors.length > 0) {
      setAlertMessage({
        title: "There are some issues with your form:",
        content: clientErrors,
        tone: "critical",
      });
      return;
    }

    // Prepare data for fetcher.submit
    const submitData = {
      customizeName,
      shippingMethod,
      message,
      // Stringify conditions for submission
      conditions: JSON.stringify(conditions),
      // Add shopGid from loader data
      shopGid: shopGid,
      // Add id if it exists from customization
      ...(existingCustomization?.id && { id: existingCustomization.id }),
    };

    // Submit data using fetcher
    fetcher.submit(submitData, {
      method: "post",
      // The action URL defaults to the current route, which is correct here
    });
  };
  // --- End Handle Fetcher Submission ---

  // --- Effect to display fetcher response ---
  React.useEffect(() => {
    if (existingCustomization?.conditions) {
      setConditions(existingCustomization?.conditions);
    }

    if (fetcher.data) {
      if (fetcher.data.errors) {
        setAlertMessage({
          title: "There are some issues with your form:",
          content: fetcher.data.errors,
          tone: "critical",
        });
      } else if (fetcher.data.success) {
        setAlertMessage({
          title: "Success",
          content: [fetcher.data.message || "Settings saved successfully"],
          tone: "success",
        });
        if (!existingCustomization?.id) {
          // Optional: Reset form fields on success
          setCustomizeName("");
          setShippingMethod("");
          setConditions([
            { type: "cart_total", operator: "greater_than", value: "" },
          ]);
        }
      }
    }
  }, [fetcher.data]);

  return (
    <>
      {/* Use fetcher.Form */}
      <fetcher.Form method="post">
        <Page
          title="Shipping Method Message"
          backAction={{
            content: "Settings",
            url: "/app/shipping-customizations",
          }}
          primaryAction={{
            content: "Save",
            onAction: handleSaveWithFetcher,
            loading: isSubmitting, // Use fetcher state for loading
            disabled: !hasActivePayment, // Use fetcher state for disabling
          }}
        >
          {!hasActivePayment && (
            <>
              <Banner
                title="Upgrade your plan"
                tone="warning"
                action={{
                  content: "Upgrade",
                  url: "/app/subscription-manage",
                  variant: "primary",
                }}
              >
                <p>
                  Upgrade your plan to get access to all the features of this
                  app.
                </p>
              </Banner>
              <br />
            </>
          )}
          {alertMessage && (
            <div className="">
              <Banner
                title={alertMessage.title}
                tone={alertMessage.tone}
                onDismiss={() => setAlertMessage(null)}
              >
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {alertMessage.content.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Banner>
              <br />
            </div>
          )}
          <Grid>
            <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 8, xl: 8 }}>
              <LeftCustomizationForm
                customizeName={customizeName}
                setCustomizeName={setCustomizeName}
                shippingMethod={shippingMethod}
                setShippingMethod={setShippingMethod}
                conditions={conditions}
                setConditions={setConditions}
                setAlertMessage={setAlertMessage}
                message={message}
                setMessage={setMessage}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 4 }}>
              <RightSideView
                customizeName={customizeName}
                shippingMethod={shippingMethod}
                conditions={conditions}
              />
            </Grid.Cell>
          </Grid>
        </Page>
        <br />
        <br />
      </fetcher.Form>
    </>
  );
}

function LeftCustomizationForm({
  customizeName,
  setCustomizeName,
  shippingMethod,
  setShippingMethod,
  conditions,
  setConditions,
  setAlertMessage,
  message,
  setMessage,
}) {
  return (
    <Card>
      <div className="" style={{ marginBottom: "10px" }}>
        <TextField
          name="customizeName" // Add name attribute
          label="Customization Name"
          placeholder="Example: Display delay message for express shipping methods"
          helpText="This is not visible to the customer"
          value={customizeName}
          onChange={setCustomizeName}
          autoComplete="off"
        />
      </div>
      {/* Select Shipping Method */}
      <div className="" style={{ marginBottom: "10px" }}>
        <AutocompleteInput
          name="shippingMethod" // Add name attribute (ensure it reaches the actual input)
          value={shippingMethod}
          onChange={setShippingMethod}
        />
      </div>
      {/* Message Section */}
      <div className="" style={{ marginBottom: "10px" }}>
        <TextField
          label="Message"
          name="message"
          placeholder="Example: Your order will be arrive in 2-3 days"
          value={message}
          onChange={setMessage}
          multiline={4}
          autoComplete="off"
        />
      </div>
      {/* Conditions Section */}
      <div className="mt-6" style={{ marginTop: "10px" }}>
        <ConditionBuilder
          conditions={conditions}
          setConditions={setConditions}
          setAlertMessage={setAlertMessage}
        />
      </div>
    </Card>
  );
}

function ConditionBuilder({ conditions, setConditions, setAlertMessage }) {
  // Add a function to check if a condition type is already used
  const isConditionTypeUsed = (type, currentIndex) => {
    const uniqueTypes = ["cart_total", "customer_type", "shipping_country"];
    if (!uniqueTypes.includes(type)) return false;

    return conditions.some(
      (condition, index) => index !== currentIndex && condition.type === type,
    );
  };

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        type: "cart_total",
        operator: "greater_than",
        value: "",
      },
    ]);
  };

  // Add the missing handleRemoveCondition function
  const handleRemoveCondition = (index) => {
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
  };

  const handleConditionChange = (index, field, value) => {
    // Check if the condition type already exists (for unique conditions)
    if (field === "type") {
      const uniqueTypes = ["cart_total", "customer_type", "shipping_country"];
      if (uniqueTypes.includes(value)) {
        const exists = conditions.some(
          (condition, i) => i !== index && condition.type === value,
        );
        if (exists) {
          setAlertMessage({
            title: "Invalid Condition",
            content: [
              `Only one ${value.replace("_", " ")} condition is allowed`,
            ],
            tone: "critical",
          });
          return;
        }
      }
    }

    // Check for duplicate condition combination
    const newConditions = [...conditions];
    newConditions[index][field] = value;

    const isDuplicate = newConditions.some(
      (condition, i) =>
        i !== index &&
        condition.type === newConditions[index].type &&
        condition.operator === newConditions[index].operator &&
        condition.value === newConditions[index].value &&
        condition.value !== "", // Only check if value is not empty
    );

    if (isDuplicate) {
      setAlertMessage({
        title: "Invalid Condition",
        content: ["Duplicate condition is not allowed"],
        tone: "critical",
      });
      return;
    }

    setConditions(newConditions);
  };

  return (
    <div>
      {/* <Text variant="headingMd" as="h2" fontWeight="semibold" className="mb-4">
          Conditions
        </Text> */}
      {conditions.map((condition, index) => (
        <div key={index} style={{ marginBottom: "16px" }}>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }}>
              <Select
                label={index === 0 ? "Condition" : ""}
                labelHidden={index !== 0}
                options={[
                  {
                    label: "Cart Total",
                    value: "cart_total",
                    disabled: isConditionTypeUsed("cart_total", index),
                  },
                  {
                    label: "Customer Tag",
                    value: "customer_tag",
                  },
                  {
                    label: "Customer Type",
                    value: "customer_type",
                    disabled: isConditionTypeUsed("customer_type", index),
                  },
                  {
                    label: "Shipping Country",
                    value: "shipping_country",
                    disabled: isConditionTypeUsed("shipping_country", index),
                  },
                  {
                    label: "Product Tag",
                    value: "product_tag",
                  },
                ]}
                value={condition.type}
                onChange={(value) =>
                  handleConditionChange(index, "type", value)
                }
              />
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 12, sm: 3, md: 3, lg: 3, xl: 3 }}>
              {condition.type === "cart_total" && (
                <Select
                  label={index === 0 ? "Operator" : ""}
                  labelHidden={index !== 0}
                  options={[
                    { label: "is greater than", value: "greater_than" },
                    { label: "is smaller than", value: "less_than" },
                  ]}
                  value={condition.operator}
                  onChange={(value) =>
                    handleConditionChange(index, "operator", value)
                  }
                />
              )}

              {(condition.type === "customer_tag" ||
                condition.type === "customer_type" ||
                condition.type === "shipping_country" ||
                condition.type === "product_tag") && (
                <Select
                  label={index === 0 ? "Operator" : ""}
                  labelHidden={index !== 0}
                  options={[
                    { label: "is", value: "is" },
                    { label: "is not", value: "is_not" },
                  ]}
                  value={condition.operator}
                  onChange={(value) =>
                    handleConditionChange(index, "operator", value)
                  }
                />
              )}
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }}>
              {condition.type === "cart_total" && (
                <TextField
                  label={index === 0 ? "Value" : ""}
                  labelHidden={index !== 0}
                  type="number"
                  prefix="$"
                  value={condition.value}
                  onChange={(value) =>
                    handleConditionChange(index, "value", value)
                  }
                  autoComplete="off"
                />
              )}

              {(condition.type === "customer_tag" ||
                condition.type === "product_tag") && (
                <TextField
                  label={index === 0 ? "Value" : ""}
                  labelHidden={index !== 0}
                  placeholder="Enter tag"
                  value={condition.value}
                  onChange={(value) =>
                    handleConditionChange(index, "value", value)
                  }
                  autoComplete="off"
                />
              )}

              {condition.type === "customer_type" && (
                <Select
                  label={index === 0 ? "Value" : ""}
                  labelHidden={index !== 0}
                  options={[
                    { label: "B2B", value: "B2B" },
                    { label: "B2C", value: "B2C" },
                  ]}
                  value={condition.value}
                  onChange={(value) =>
                    handleConditionChange(index, "value", value)
                  }
                />
              )}

              {condition.type === "shipping_country" && (
                <Select
                  label={index === 0 ? "Value" : ""}
                  labelHidden={index !== 0}
                  options={[
                    { label: "US", value: "US" },
                    { label: "CA", value: "CA" },
                    { label: "UK", value: "UK" },
                    { label: "AU", value: "AU" },
                    { label: "DE", value: "DE" },
                    { label: "FR", value: "FR" },
                    { label: "JP", value: "JP" },
                    { label: "IN", value: "IN" },
                  ]}
                  value={condition.value}
                  onChange={(value) =>
                    handleConditionChange(index, "value", value)
                  }
                />
              )}
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 12, sm: 1, md: 1, lg: 1, xl: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                {index === 0 ? (
                  <div style={{ marginTop: "28px" }}>
                    <Button
                      icon={DeleteIcon}
                      onClick={() => handleRemoveCondition(index)}
                      accessibilityLabel="Remove condition"
                      plain
                    />
                  </div>
                ) : (
                  <Button
                    icon={DeleteIcon}
                    onClick={() => handleRemoveCondition(index)}
                    accessibilityLabel="Remove condition"
                    plain
                  />
                )}
              </div>
            </Grid.Cell>
          </Grid>
        </div>
      ))}

      <div style={{ marginTop: "16px" }}>
        <Button
          onClick={handleAddCondition}
          fullWidth
          variant="primary"
          icon={PlusIcon}
          textAlign="center"
        >
          Add condition
        </Button>
      </div>
    </div>
  );
}

function AutocompleteInput({ value, onChange, name }) {
  const deselectedOptions = useMemo(
    () => [
      { value: "Economy", label: "Economy" },
      { value: "Standard", label: "Standard" },
      { value: "Express", label: "Express" },
      { value: "Pick up", label: "Pick up" },
      { value: "Premium", label: "Premium" },
    ],
    [],
  );

  const updateText = useCallback(
    (value) => {
      onChange(value);
    },
    [onChange],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedValue = selected.map((selectedItem) => {
        const matchedOption = deselectedOptions.find((option) => {
          return option.value.match(selectedItem);
        });
        return matchedOption && matchedOption.label;
      });
      onChange(selectedValue[0] || "");
    },
    [deselectedOptions, onChange],
  );

  const textField = (
    <Autocomplete.TextField
      name={name} // Pass name to the underlying TextField
      onChange={updateText}
      label="Select Shipping Method"
      value={value}
      prefix={<Icon source={SearchIcon} tone="base" />}
      placeholder="Search or Enter Custom Shipping Method"
      helpText="Don't see your shipping method? You can type it manually and press Enter to add it to the list."
      autoComplete="off"
    />
  );

  return (
    <div>
      <Autocomplete
        options={deselectedOptions}
        selected={value ? [value] : []}
        onSelect={updateSelection}
        textField={textField}
      />
    </div>
  );
}

// Right Side View Section
function RightSideView({ customizeName, shippingMethod, conditions }) {
  const getConditionText = (condition) => {
    switch (condition.type) {
      case "cart_total":
        return `Cart Total ${condition.operator === "greater_than" ? "is greater than" : "is smaller than"} $${condition.value}`;
      case "customer_tag":
        return `Customer Tag ${condition.operator === "is" ? "is" : "is not"} ${condition.value}`;
      case "customer_type":
        return `Customer Type ${condition.operator === "is" ? "is" : "is not"} ${condition.value}`;
      case "shipping_country":
        return `Shipping Country ${condition.operator === "is" ? "is" : "is not"} ${condition.value}`;
      case "product_tag":
        return `Product Tag ${condition.operator === "is" ? "is" : "is not"} ${condition.value}`;
      default:
        return "";
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <Text variant="headingMd" as="h2">
            Summary
          </Text>
        </div>

        <div>
          <Text variant="bodyMd" fontWeight="semibold">
            Customization Name
          </Text>
          <Text variant="bodyMd" color="subdued">
            {customizeName || "-"}
          </Text>
        </div>

        <div>
          <Text variant="bodyMd" fontWeight="semibold">
            Shipping Method
          </Text>
          <Text variant="bodyMd" color="subdued">
            {shippingMethod || "-"}
          </Text>
        </div>

        <div>
          <Text variant="bodyMd" fontWeight="semibold">
            Conditions
          </Text>
          <div className="space-y-2 mt-2">
            {conditions.map((condition, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <Text variant="bodyMd">{getConditionText(condition)}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
