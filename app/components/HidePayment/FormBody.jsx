import { useState, useCallback, useMemo } from "react";
import { 
  Card, 
  TextField, 
  Button, 
  Grid, 
  Form, 
  Banner,
  Text,
  Box
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";

import AutocompleteExample from "./AutocompleteExample";
import ConditionBuilder from "./ConditionBuilder";
import ProductSelectionModal from "./ProductSelectionModal";

export function FormBody({ id }) {
  const [parentValue, setParentValue] = useState("");
  const [customizeName, setCustomizeName] = useState("");
  const [bannerStatus, setBannerStatus] = useState({ show: false, status: '', message: '' });
  
  const handleChildValue = (childValue) => {
    setParentValue(childValue);
  };

  // Modal logic for selecting products
  const [modalActive, setModalActive] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]); 
  const [currentConditionIndex, setCurrentConditionIndex] = useState(null);

  // Predefined list of products for selection
  const products = useMemo(
    () => [
      {
        id: "gid://shopify/ProductVariant/46322014617839",
        title: "The Compare at Price Snowboard",
      },
    ],
    []
  );

  const toggleModal = useCallback(() => {
    setModalActive((active) => !active);
  }, []);

  const handleSelectProduct = useCallback((id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleConfirmSelection = useCallback(() => {
    if (currentConditionIndex !== null) {
      setConditions((prevConditions) =>
        prevConditions.map((c, i) =>
          i === currentConditionIndex
            ? { ...c, selectedProducts: selectedProducts }
            : c
        )
      );
    }
    toggleModal();
  }, [currentConditionIndex, selectedProducts, toggleModal]);

  // State to manage the list of conditions
  const [conditions, setConditions] = useState([
    {
      discountType: "cart_total",
      greaterOrSmall: "greater_than",
      amount: 0,
      selectedProducts: [],
      country: "in",
    },
  ]);

  // Function to add a new condition
  const handleAddCondition = () => {
    const newDiscountType = "cart_total";
    if (
      conditions.some((condition) => condition.discountType === newDiscountType)
    ) {
      setBannerStatus({
        show: true,
        status: 'warning',
        message: 'This condition type already exists.'
      });
      return;
    }
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
      prevConditions.filter((_, i) => i !== index)
    );
  };

  // Function to handle changes in condition fields
  const handleConditionChange = (index, field, value) => {
    setConditions((prevConditions) =>
      prevConditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    );
  };

  const [cartAmount, setCartAmount] = useState(0);

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
    const newErrors = {};

    // Validate customization name
    if (!customizeName || customizeName.trim() === "") {
      newErrors.customizeName = "Customization name is required";
    } else if (customizeName === "No name..") {
      newErrors.customizeName = "Please enter a valid name";
    }

    // Validate payment method
    if (!parentValue || parentValue.trim() === "") {
      newErrors.paymentMethod = "Payment method is required";
    }

    // Validate conditions
    if (conditions.length === 0) {
      newErrors.conditions = "At least one condition is required";
    } else {
      conditions.forEach((condition, index) => {
        if (condition.discountType === "cart_total" && !cartAmount) {
          newErrors[`cartAmount`] = "Cart amount is required";
        }
        if (
          condition.discountType === "product" &&
          condition.selectedProducts.length === 0
        ) {
          newErrors[`products`] = "At least one product must be selected";
        }
        if (
          condition.discountType === "shipping_country" &&
          !condition.country
        ) {
          newErrors[`country`] = "Country is required";
        }
      });
    }

    setErrors(newErrors);
    
    // Show error banner if there are errors
    if (Object.keys(newErrors).length > 0) {
      setBannerStatus({
        show: true,
        status: 'critical',
        message: 'Please fix the errors in the form before submitting.'
      });
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

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
        formData.append(`cartTotal`, cartAmount);
      } else if (condition.discountType === "product") {
        formData.append(
          `selectedProducts`,
          condition.selectedProducts.join(",")
        );
      } else if (condition.discountType === "shipping_country") {
        formData.append(`country`, condition.country);
      }
    });

    try {
      await fetcher.submit(formData, {
        method: "POST",
        action: ".",
      });

      // Handle successful submission
      if (fetcher.data?.error) {
        throw new Error(fetcher.data.error);
      }

      // Reset form or show success message
      if (fetcher.state === "idle" && !fetcher.data?.error) {
        setBannerStatus({
          show: true,
          status: 'success',
          message: 'Payment method settings saved successfully!'
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      setBannerStatus({
        show: true,
        status: 'critical',
        message: 'Failed to save. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid>
      <Grid.Cell columnSpan={{ md: 12, lg: 8, xl: 8 }}>
        <Card
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
          }}
        >
          {/* Banner for displaying messages */}
          {bannerStatus.show && (
            <div style={{ marginBottom: '20px' }}>
              <Banner
                title={bannerStatus.status === 'success' ? 'Success' : bannerStatus.status === 'warning' ? 'Warning' : 'Error'}
                status={bannerStatus.status}
                onDismiss={() => setBannerStatus({ show: false, status: '', message: '' })}
              >
                <p>{bannerStatus.message}</p>
              </Banner>
            </div>
          )}
          
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
                  onChange={(e) => {
                    setCustomizeName(e);
                    if (errors.customizeName) {
                      setErrors((prev) => ({
                        ...prev,
                        customizeName: undefined,
                      }));
                    }
                  }}
                  error={errors.customizeName}
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
                  onValueChange={(value) => {
                    handleChildValue(value);
                    if (errors.paymentMethod) {
                      setErrors((prev) => ({
                        ...prev,
                        paymentMethod: undefined,
                      }));
                    }
                  }}
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

              {/* Condition Builder Component */}
              <ConditionBuilder
                conditions={conditions}
                handleConditionChange={handleConditionChange}
                handleRemoveCondition={handleRemoveCondition}
                openModalForCondition={openModalForCondition}
                cartAmount={cartAmount}
                setCartAmount={setCartAmount}
                errors={errors}
                setErrors={setErrors}
                isSubmitting={isSubmitting}
              />

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
                  loading={isSubmitting}
                >
                  Submit
                </Button>
              </div>
            </div>
          </Form>

          {/* Product Selection Modal */}
          <ProductSelectionModal
            modalActive={modalActive}
            toggleModal={toggleModal}
            products={products}
            selectedProducts={selectedProducts}
            handleSelectProduct={handleSelectProduct}
            handleConfirmSelection={handleConfirmSelection}
          />
        </Card>
      </Grid.Cell>
      <Grid.Cell columnSpan={{ md: 12, lg: 4, xl: 4 }}>
        <Card roundedAbove="sm">
          <Text as="h2" variant="headingSm">
            Online store dashboard
          </Text>
          <Box paddingBlockStart="200">
            <Text as="p" variant="bodyMd">
              View a summary of your online store's performance.
            </Text>
          </Box>
        </Card>
      </Grid.Cell>
    </Grid>
  );
}

export default FormBody;