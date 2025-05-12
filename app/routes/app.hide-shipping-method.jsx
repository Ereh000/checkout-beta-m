// app/hide-shipping-method

import {
  Card,
  Grid,
  Icon,
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
//   import "./";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node"; // Import json and redirect
import { authenticate, PLUS_PLAN, PLUS_PLAN_YEARLY } from "../shopify.server"; // Assuming authenticate utility
import prisma from "../db.server"; // Assuming prisma client path

// --- Loader Function ---
export async function loader({ request }) {
  const { admin, billing } = await authenticate.admin(request);

  // Get the URL from the request
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

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

  // If id parameter exists, fetch the customization details
  let customization = null;
  if (id) {
    customization = await prisma.shippingCustomization.findUnique({
      where: {
        id: id,
      },
    });

    if (!customization) {
      throw new Response("Customization not found", { status: 404 });
    }
  }

  // Return the shopGid
  return json({
    shopGid,
    customization,
    hasActivePayment,
    appSubscriptions,
    shopPlan,
  });
}
// --- End Loader Function ---

export default function MainHideShippingMethod() {
  // Get shopGid from loader data
  const { shopGid, customization, shopPlan, hasActivePayment } =
    useLoaderData();
  // Initialize fetcher
  const fetcher = useFetcher();
  // Use fetcher.state for loading status
  const isSubmitting = fetcher.state !== "idle";
  const [customizeName, setCustomizeName] = useState(customization?.name || "");
  const [shippingMethod, setShippingMethod] = useState(
    customization?.shippingMethodToHide || "",
  );
  const [conditions, setConditions] = useState([
    {
      type: "cart_total",
      operator: "greater_than",
      value: "",
    },
  ]);
  console.log("conditions:", conditions);
  const [alertMessage, setAlertMessage] = useState(null);

  const validateForm = () => {
    const errors = [];

    if (!customizeName.trim()) {
      errors.push("Customization name is required");
    }

    if (!shippingMethod.trim()) {
      errors.push("Shipping method is required");
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
      // Stringify conditions for submission
      conditions: JSON.stringify(conditions),
      // Add shopGid from loader data
      shopGid: shopGid,
      // Add id if it exists from customization
      ...(customization?.id && { id: customization.id }),
    };

    // Submit data using fetcher
    fetcher.submit(submitData, {
      method: "post",
      action: "/api/hide-shipping-method",
      // The action URL defaults to the current route, which is correct here
    });
  };
  // --- End Handle Fetcher Submission ---

  // --- Effect to display fetcher response ---
  React.useEffect(() => {
    // IsEditing if conditions availbale show them
    if (customization?.conditions) {
      setConditions(customization.conditions);
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
        if (!customization?.id) {
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
          title="Hide Shipping Method"
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
}) {
  return (
    <Card>
      <div className="mb-4">
        <TextField
          name="customizeName" // Add name attribute
          label="Customization Name"
          placeholder="Example: Display delay message for express shipping"
          helpText="This is not visible to the customer"
          value={customizeName}
          onChange={setCustomizeName}
          autoComplete="off"
        />
      </div>
      {/* Select Shipping Method */}
      <div className="">
        <AutocompleteInput
          name="shippingMethod" // Add name attribute (ensure it reaches the actual input)
          value={shippingMethod}
          onChange={setShippingMethod}
        />
      </div>
      {/* Conditions Section */}
      <div className="mt-6">
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
      <Text variant="headingMd" as="h2" fontWeight="semibold" className="mb-4">
        Conditions
      </Text>
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
                    { label: "is small than", value: "less_than" },
                    { label: "is greater than", value: "less_than" },
                  ]}
                  value={condition.operator || "greater_than"}
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
