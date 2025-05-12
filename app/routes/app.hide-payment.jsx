// Import necessary components and libraries from Shopify Polaris UI framework
import {
  Card,
  TextField,
  Select,
  Button,
  Icon,
  Page,
  Text,
  Box,
  Grid,
  Autocomplete,
  Banner,
} from "@shopify/polaris";

// Import custom icons for the application
import { DeleteIcon, SearchIcon } from "@shopify/polaris-icons";

// Import React hooks and utilities
import { useCallback, useEffect, useMemo, useState } from "react";

// Import authentication and API utility functions from shopify.server
import { authenticate, PLUS_PLAN, PLUS_PLAN_YEARLY } from "../shopify.server";

// Import Remix Run hooks and utilities for handling server-side actions and data fetching
import {
  Form,
  json,
  useActionData,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import prisma from "../db.server";

// Loader function to fetch shop data from Shopify API
export async function loader({ request }) {
  const { admin, session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const idd = url.searchParams.get("id");
  console.log("id", idd);

  try {
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

    // Query the Shopify GraphQL API to get the shop ID
    const response = await admin.graphql(`
      query{
        shop{
          id
        }
      }
    `);
    const shop = await response.json();

    let customizationData = null;
    if (idd) {
      // Fetch customization data if ID exists
      customizationData = await prisma.paymentHide.findUnique({
        where: { id: parseInt(idd) },
      });
    }
    console.log("customization", customizationData);

    // Return the shop ID as part of the loader data
    return {
      id: shop.data.shop.id,
      host: session.shop, // Add host information
      customization: customizationData,
      hasActivePayment,
      appSubscriptions,
      shopPlan,
    };
  } catch (error) {
    // Handle errors by returning an error message
    return { message: "owner not found", error: error };
  }
}

// Main component rendering the page
export default function CustomizationSection() {
  const {
    id,
    host,
    customization,
    hasActivePayment,
    appSubscriptions,
    shopPlan,
  } = useLoaderData(); // Fetch shop ID from loader data
  // const dataa = useActionData(); // Fetch action data after form submission

  // console.log("customization", customization);

  return (
    <Page
      backAction={{ content: "Settings", url: "/app/payment-customization" }} // Back button navigation
      title="Hide Payment Method" // Page title
    >
      {!hasActivePayment && (
        <>
          <Banner
            title="Upgrade your plan"
            tone="warning"
            action={{ content: "Upgrade", url: "/app/subscription-manage", variant: "primary"  }}
          >
            <p>
              You store type is not Shopify Plus or Developer's Preview. You
              can't customize checkout page.
            </p>
          </Banner>
          <br />
        </>
      )}
      <Body hasActivePayment={hasActivePayment} id={id} host={host} customization={customization} />{" "}
      {/* Render the main form body */}
    </Page>
  );
}

// Component responsible for rendering the form fields and interactions
export function Body({ id, host, customization, hasActivePayment }) {
  const [alertMessage, setAlertMessage] = useState(null); // Add new state for alert messages
  const [parentValue, setParentValue] = useState(
    customization?.paymentMethod || "",
  ); // Parent value state
  const [customizeName, setCustomizeName] = useState(
    customization?.customizeName || "",
  ); // Customization name state
  const handleChildValue = (childValue) => {
    setParentValue(childValue); // Handle child value change
  };

  // Modal logic for selecting products
  const [currentConditionIndex, setCurrentConditionIndex] = useState(null); // Track the active condition index

  // Initialize conditions from customization data if it exists
  const [conditions, setConditions] = useState(() => {
    if (customization?.conditions && customization.conditions.length > 0) {
      return customization.conditions.map((condition) => ({
        discountType: condition.type,
        greaterOrSmall: condition.greaterOrSmall,
        amount: condition.cartTotal || 0,
        selectedProducts: condition.selectedProducts
          ? condition.selectedProducts.split(",")
          : [],
        country: condition.country || "in",
      }));
    }
    return [
      {
        discountType: "product",
        greaterOrSmall: "is",
        amount: 0,
        selectedProducts: [],
        country: "in",
      },
    ];
  });

  // Remove the static products array and modal state
  // Add resource picker handler
  const handleProductPicker = useCallback(
    async (index) => {
      const products = await window.shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
        host: host,
        selectMultiple: true,
        initialQuery: "",
        resourceType: "Product",
        showVariants: false,
      });

      if (products) {
        const selectedProducts = products.map((product) => ({
          id: product.id,
          title: product.title,
          productType: product.productType,
          handle: product.handle,
        }));

        setConditions((prevConditions) =>
          prevConditions.map((c, i) =>
            i === index
              ? {
                  ...c,
                  selectedProducts: selectedProducts.map((p) => p.id),
                  productTitles: selectedProducts.map((p) => p.title),
                }
              : c,
          ),
        );
      }
    },
    [host],
  );

  const toggleModal = useCallback(() => {
    setModalActive((active) => !active); // Toggle modal visibility
  }, []);

  // Update the selectedProductTitles calculation
  const selectedProductTitles =
    conditions[currentConditionIndex]?.selectedProducts || [];

  // Function to add a new condition
  // Remove duplicate check from handleAddCondition
  const handleAddCondition = () => {
    const newDiscountType = "cart_total";
    setConditions((prevConditions) => [
      ...prevConditions,
      {
        discountType: newDiscountType,
        greaterOrSmall: "greater_than",
        amount: 0,
        selectedProducts: [],
        country: "in",
      },
    ]);
  };

  // Function to remove a condition
  const handleRemoveCondition = (index) => {
    setConditions((prevConditions) =>
      prevConditions.filter((_, i) => i !== index),
    );
  };

  // Function to handle changes in condition fields
  const handleConditionChange = (index, field, value) => {
    setConditions((prevConditions) =>
      prevConditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    );
  };

  // const [cartAmount, setCartAmount] = useState(0); // Cart amount state

  // Function to open modal and set current condition index
  const openModalForCondition = (index) => {
    setCurrentConditionIndex(index);
    setSelectedProducts(conditions[index].selectedProducts);
    toggleModal();
  };

  // Validation function
  const fetcher = useFetcher();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errorMessages = [];

    // Validate customization name
    if (!customizeName || customizeName.trim() === "") {
      errorMessages.push("Customization name is required");
    } else if (customizeName === "No name..") {
      errorMessages.push("Please enter a valid name");
    }

    // Validate payment method
    if (!parentValue || parentValue.trim() === "") {
      errorMessages.push("Payment method is required");
    }

    // Check for duplicate conditions
    const conditionTypes = conditions.map((c) => c.discountType);
    const uniqueConditions = new Set(conditionTypes);
    if (uniqueConditions.size !== conditionTypes.length) {
      errorMessages.push(
        "Duplicate conditions are not allowed. Please remove duplicate conditions.",
      );
    }

    // Existing validation checks
    if (!customizeName || customizeName.trim() === "") {
      errorMessages.push("Customization name is required");
    } else if (customizeName === "No name..") {
      errorMessages.push("Please enter a valid name");
    }

    // Validate conditions
    if (conditions.length === 0) {
      errorMessages.push("At least one condition is required");
    } else {
      conditions.forEach((condition) => {
        if (condition.discountType === "cart_total" && !condition.amount) {
          errorMessages.push("Cart amount is required");
        }
        if (
          condition.discountType === "product" &&
          (!condition.selectedProducts ||
            condition.selectedProducts.length === 0)
        ) {
          errorMessages.push("At least one product must be selected");
        }
        if (
          condition.discountType === "shipping_country" &&
          !condition.country
        ) {
          errorMessages.push("Country is required");
        }
      });
    }

    if (errorMessages.length > 0) {
      setAlertMessage({
        status: "critical",
        message: (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {errorMessages.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use only validateForm for all validations
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Prepare form data
    const formData = new FormData();
    formData.append("id", id);
    formData.append("customizeName", customizeName);
    formData.append("paymentMethod", parentValue);

    // Add conditions
    conditions.forEach((condition, index) => {
      formData.append(`conditionType`, condition.discountType);
      formData.append(`greaterSmaller`, condition.greaterOrSmall);

      if (condition.discountType === "cart_total") {
        formData.append(`cartTotal`, parseFloat(condition.amount) || 0); // Changed to parseFloat
      } else if (condition.discountType === "product") {
        const productIds = condition.selectedProducts || [];
        formData.append(`selectedProducts`, productIds.join(","));
      } else if (condition.discountType === "shipping_country") {
        formData.append(`country`, condition.country || "");
      }
    });

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/payments/hide",
    });
  };

  // useEffect to handle fetcher state changes (loading and success/error messages)
  useEffect(() => {
    // Check if the fetcher is idle (finished submitting) and has data
    if (fetcher.state === "idle" && fetcher.data) {
      setIsSubmitting(false); // Stop loading state

      if (fetcher.data.success) {
        setAlertMessage({
          status: "success",
          // Use the message from the backend if available
          message: fetcher.data.message || "Settings saved successfully!",
        });
        // Optionally reset form fields here if needed
      } else if (
        fetcher.data.errors ||
        fetcher.data.error ||
        fetcher.data.userErrors
      ) {
        // Handle different possible error structures from the backend
        let errorContent = "Failed to save settings.";
        if (fetcher.data.errors && Array.isArray(fetcher.data.errors)) {
          errorContent = (
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {fetcher.data.errors.map((error, index) => (
                <li key={index}>
                  {typeof error === "string" ? error : JSON.stringify(error)}
                </li>
              ))}
            </ul>
          );
        } else if (fetcher.data.error) {
          errorContent = fetcher.data.error;
        } else if (
          fetcher.data.userErrors &&
          Array.isArray(fetcher.data.userErrors)
        ) {
          errorContent = (
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {fetcher.data.userErrors.map((error, index) => (
                <li key={index}>{error.message}</li> // Assuming userErrors have a 'message' field
              ))}
            </ul>
          );
        }
        setAlertMessage({
          status: "critical",
          message: errorContent,
        });
      } else {
        // Handle unexpected response structure
        setAlertMessage({
          status: "critical",
          message: "An unexpected response was received from the server.",
        });
      }
    } else if (fetcher.state === "submitting" || fetcher.state === "loading") {
      // Ensure loading state is active while submitting/loading
      setIsSubmitting(true);
    } else if (fetcher.state === "idle" && !fetcher.data) {
      // Handle cases where submission finishes without data (e.g., navigation interrupt)
      setIsSubmitting(false);
    }
  }, [fetcher.state, fetcher.data]); // Dependencies for the effect

  return (
    <Grid>
      <Grid.Cell columnSpan={{ md: 12, lg: 12, xl: 12 }}>
        {/* Alert Banner rendering (keep as is) */}
        {alertMessage && (
          <Banner
            tone={alertMessage.status === "success" ? "success" : "critical"}
            onDismiss={() => setAlertMessage(null)}
          >
            {alertMessage.message}
          </Banner>
        )}
      </Grid.Cell>
      <Grid.Cell columnSpan={{ md: 12, lg: 8, xl: 8 }}>
        <Card
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
          }}
        >
          <Form method="POST" onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={id} />

            <div className="formdetails">
              {/* Customization Name */}
              <div>
                <label style={{ fontWeight: "bold", marginBottom: "5px" }}>
                  Customization Name
                </label>
                <TextField
                  placeholder="Example: Hide Cash on Delivery (COD) For Large Orders"
                  style={{ width: "100%" }}
                  name="customizeName"
                  value={customizeName}
                  onChange={setCustomizeName}
                />
                <p
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#6B7280",
                  }}
                >
                  This is not visible to the customer
                </p>
              </div>

              {/* Select Payment Method */}
              <div style={{ marginTop: "20px" }}>
                <label style={{ fontWeight: "bold", marginBottom: "5px" }}>
                  Select Payment Method
                </label>
                <AutocompleteExample
                  editvalue={customization?.paymentMethod}
                  onValueChange={handleChildValue}
                />
                {errors.paymentMethod && (
                  <div
                    style={{ color: "red", fontSize: "12px", marginTop: "5px" }}
                  >
                    {errors.paymentMethod}
                  </div>
                )}
                <input type="hidden" name="paymentMethod" value={parentValue} />
                <p
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#6B7280",
                  }}
                >
                  Don't see your payment method? You can type it manually and
                  press Enter to add it to the list.
                </p>
              </div>

              {/* Condition Builder */}
              <div style={{ marginTop: "20px" }}>
                {errors.conditions && (
                  <div
                    style={{
                      color: "red",
                      fontSize: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    {errors.conditions}
                  </div>
                )}
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "self-start",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    {/* Dropdown 1 */}
                    <div className="" style={{ flexGrow: 1 }}>
                      <Select
                        options={[
                          { label: "Cart Total", value: "cart_total" },
                          { label: "Product", value: "product" },
                          {
                            label: "Shipping Country",
                            value: "shipping_country",
                          },
                        ]}
                        placeholder="Select a field"
                        style={{ flex: 1 }}
                        value={condition.discountType}
                        onChange={(value) =>
                          handleConditionChange(index, "discountType", value)
                        }
                        name={`conditionType`}
                      />
                    </div>

                    {/* Condition-specific fields */}
                    {/* grater/lessThan label revrsed as logic works like this */}
                    {condition.discountType === "cart_total" && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Select
                          options={[
                            { label: "is less than", value: "greater_than" },
                            { label: "is greater than", value: "less_than" },
                          ]}
                          placeholder="Select a condition"
                          style={{ flex: 1 }}
                          value={condition.greaterOrSmall}
                          onChange={(value) =>
                            handleConditionChange(
                              index,
                              "greaterOrSmall",
                              value,
                            )
                          }
                          name={`greaterSmaller`}
                        />
                        <TextField
                          placeholder="100"
                          type="number"
                          value={condition.amount}
                          onChange={(value) =>
                            handleConditionChange(
                              index,
                              "amount",
                              parseFloat(value),
                            )
                          }
                          style={{ flex: 1 }}
                          name="cartTotal"
                        />
                      </div>
                    )}

                    {condition.discountType === "product" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <Select
                          options={[{ label: "is", value: "is" }]}
                          style={{ flex: 1 }}
                          value={condition.greaterOrSmall}
                          onChange={(value) =>
                            handleConditionChange(
                              index,
                              "greaterOrSmall",
                              value,
                            )
                          }
                          name={`greaterSmaller`}
                        />
                        <input
                          type="hidden"
                          label="Selected Products"
                          value={condition.selectedProducts.join(", ")}
                          name={`selectedProducts`}
                        />
                        <Button
                          onClick={() => handleProductPicker(index)}
                          disabled={isSubmitting}
                        >
                          Select Products
                        </Button>
                        {/* {condition.productTitles &&
                          condition.productTitles.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <Text variant="bodyMd">Selected Products:</Text>
                              <ul
                                style={{
                                  marginTop: "5px",
                                  paddingLeft: "20px",
                                }}
                              >
                                {condition.productTitles.map((title, idx) => (
                                  <li key={idx}>{title}</li>
                                ))}
                              </ul>
                            </div>
                          )} */}
                        {errors[`products`] && (
                          <div style={{ color: "red", fontSize: "12px" }}>
                            {errors[`products`]}
                          </div>
                        )}
                      </div>
                    )}

                    {condition.discountType === "shipping_country" && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Select
                          options={[{ label: "is", value: "is" }]}
                          style={{ flex: 1 }}
                          value={condition.greaterOrSmall}
                          onChange={(value) =>
                            handleConditionChange(
                              index,
                              "greaterOrSmall",
                              value,
                            )
                          }
                          name={`greaterSmaller`}
                        />
                        <Select
                          options={[
                            { label: "IN", value: "in" },
                            { label: "CN", value: "cn" },
                          ]}
                          style={{ flex: 1 }}
                          value={condition.country}
                          onChange={(value) =>
                            handleConditionChange(index, "country", value)
                          }
                          name={`country`}
                        />
                      </div>
                    )}

                    {/* Trash Icon */}
                    <Button
                      onClick={() => handleRemoveCondition(index)}
                      disabled={isSubmitting}
                    >
                      <Icon source={DeleteIcon} color="critical" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Condition Button */}
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleAddCondition}
                  disabled={isSubmitting}
                >
                  +Add condition
                </Button>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <Button
                  submit
                  variant="primary"
                  fullWidth
                  loading={isSubmitting} // Use isSubmitting state here
                  disabled={!hasActivePayment ? true : false}
                >
                  Save
                </Button>
              </div>
            </div>
          </Form>
        </Card>
      </Grid.Cell>
      <Grid.Cell columnSpan={{ md: 12, lg: 4, xl: 4 }}>
        <Card roundedAbove="sm">
          <Text as="h2" variant="headingSm">
            Online store dashboard
          </Text>
          <Box paddingBlockStart="200">
            <Text as="p" variant="bodyMd">
              View a summary of your selections below:
            </Text>

            {/* Display selected inputs */}
            <Box paddingBlockStart="300">
              {customizeName && (
                <Box paddingBlockEnd="200">
                  <Text fontWeight="bold" as="span">
                    Customization Name:{" "}
                  </Text>
                  <Text as="span">{customizeName}</Text>
                </Box>
              )}

              {parentValue && (
                <Box paddingBlockEnd="200">
                  <Text fontWeight="bold" as="span">
                    Payment Method:{" "}
                  </Text>
                  <Text as="span">{parentValue}</Text>
                </Box>
              )}

              {conditions.map((condition, index) => (
                <Box key={index} paddingBlockEnd="200">
                  <Text fontWeight="bold" as="p">
                    Condition {index + 1}:
                  </Text>

                  <Box paddingInlineStart="300" paddingBlockEnd="100">
                    <Text fontWeight="bold" as="span">
                      Type:{" "}
                    </Text>
                    <Text as="span">
                      {condition.discountType === "cart_total"
                        ? "Cart Total"
                        : condition.discountType === "product"
                          ? "Product"
                          : "Shipping Country"}
                    </Text>
                  </Box>

                  {condition.discountType === "cart_total" && (
                    <Box paddingInlineStart="300" paddingBlockEnd="100">
                      <Text fontWeight="bold" as="span">
                        Amount:{" "}
                      </Text>
                      <Text as="span">
                        {condition.greaterOrSmall === "greater_than"
                          ? ">"
                          : "<"}{" "}
                        {condition.amount}
                      </Text>
                    </Box>
                  )}

                  {condition.discountType === "product" &&
                    condition.productTitles && (
                      <Box paddingInlineStart="300" paddingBlockEnd="100">
                        <Text fontWeight="bold" as="p">
                          Selected Products:
                        </Text>
                        <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                          {condition.productTitles.map((title, idx) => (
                            <li key={idx}>
                              <Text as="span">{title}</Text>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    )}

                  {condition.discountType === "shipping_country" && (
                    <Box paddingInlineStart="300" paddingBlockEnd="100">
                      <Text fontWeight="bold" as="span">
                        Country:{" "}
                      </Text>
                      <Text as="span">{condition.country.toUpperCase()}</Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      </Grid.Cell>
    </Grid>
  );
}

// Custom autocomplete component
export function AutocompleteExample({ onValueChange, editvalue }) {
  console.log("editvalue", editvalue);
  const deselectedOptions = useMemo(
    () => [{ value: "cash_on_delivery", label: "Cash On Delivery" }],
    [],
  );

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState(editvalue ? editvalue : "");
  const [options, setOptions] = useState(deselectedOptions);

  const updateText = useCallback(
    (value) => {
      setInputValue(value);
      if (value === "") {
        setOptions(deselectedOptions);
        return;
      }
      const filterRegex = new RegExp(value, "i");
      const resultOptions = deselectedOptions.filter((option) =>
        option.label.match(filterRegex),
      );
      setOptions(resultOptions);
    },
    [deselectedOptions],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedValue = selected.map((selectedItem) => {
        const matchedOption = options.find((option) => {
          return option.value.match(selectedItem);
        });
        return matchedOption && matchedOption.label;
      });
      setSelectedOptions(selected);
      setInputValue(selectedValue[0] || "");
      onValueChange(selectedValue[0] || "");
    },
    [options, onValueChange],
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      value={inputValue}
      prefix={<Icon source={SearchIcon} tone="base" />}
      placeholder="Search"
      autoComplete="off"
    />
  );

  return (
    <div>
      <Autocomplete
        options={options}
        selected={selectedOptions}
        onSelect={updateSelection}
        textField={textField}
      />
    </div>
  );
}
