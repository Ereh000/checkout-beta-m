import { Select, TextField, Button, Icon } from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";

function ConditionBuilder({
  conditions,
  handleConditionChange,
  handleRemoveCondition,
  openModalForCondition,
  cartAmount,
  setCartAmount,
  errors,
  setErrors,
  isSubmitting
}) {
  return (
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
          {condition.discountType === "cart_total" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <Select
                options={[
                  { label: "is greater than", value: "greater_than" },
                  { label: "is less than", value: "less_than" },
                ]}
                placeholder="Select a condition"
                style={{ flex: 1 }}
                value={condition.greaterOrSmall}
                onChange={(value) =>
                  handleConditionChange(
                    index,
                    "greaterOrSmall",
                    value
                  )
                }
                name={`greaterSmaller`}
              />
              <TextField
                placeholder="100"
                type="number"
                value={cartAmount}
                onChange={(value) => {
                  setCartAmount(value);
                  if (errors[`cartAmount`]) {
                    setErrors((prev) => ({
                      ...prev,
                      [`cartAmount`]: undefined,
                    }));
                  }
                }}
                style={{ flex: 1 }}
                name="cartTotal"
                error={errors[`cartAmount`]}
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
                    value
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
                onClick={() => openModalForCondition(index)}
                disabled={isSubmitting}
              >
                Select Products
              </Button>
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
                    value
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
                onChange={(value) => {
                  handleConditionChange(index, "country", value);
                  if (errors[`country`]) {
                    setErrors((prev) => ({
                      ...prev,
                      [`country`]: undefined,
                    }));
                  }
                }}
                name={`country`}
                error={errors[`country`]}
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
  );
}

export default ConditionBuilder;