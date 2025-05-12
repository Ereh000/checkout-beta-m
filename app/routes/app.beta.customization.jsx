import React, { useState, useCallback, useEffect } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  TextField,
  Text,
  Button,
  Select,
  Icon,
  Tooltip,
  Popover,
  ColorPicker,
  Banner,
  Layout, // Import Layout
} from "@shopify/polaris";
import {
  ChevronRightIcon,
  QuestionCircleIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { json, useFetcher, useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const shop = session.shop; // Get shop URL from session

  // fetch checkout profile id
  const checkoutProfileId = await admin.graphql(`
    query {
        checkoutProfiles(first: 1, query: "is_published:true") {
            nodes{  
            id
            }
        }
    }
  `);

  const checkoutProfileIdData = await checkoutProfileId.json();
  const checkoutId = checkoutProfileIdData.data.checkoutProfiles.nodes[0].id;
  console.log("checkoutId", checkoutId);

  // fetch checkout profile stylings -----
  const checkoutProfileStylings = await admin.graphql(
    `
   query GetCheckoutBranding($checkoutProfileId: ID!) {
    checkoutBranding(checkoutProfileId: $checkoutProfileId) {
      designSystem {
        colors{
          schemes{
            scheme1{
              base{
                background
                text
                accent
              }
              control{
                background
                border
                accent
                text
              }
              primaryButton{
                background
                text
                accent
                hover{
                  background
                  text
                  accent
                }
              }
              secondaryButton{
                background
                text
                accent
                hover{
                  background
                }
              }
            }
            scheme2{
              base{
                background
                text
                accent
              }
              control{
                background
                border
                accent
                text
              }
              primaryButton{
                background
                text
                accent
                hover{
                  background
                  text
                  accent
                }
              }
              secondaryButton{
                background
                text
                accent
                hover{
                  background
                }
              }
            }
          }
          global{
            info
            success
            accent
            warning
            critical
            decorative
          }
        }
        cornerRadius{
          base
          small
          large
        }
      }
    }
    }`,
    {
      variables: { checkoutProfileId: checkoutId },
    },
  );

  const checkoutProfileStylingsData = await checkoutProfileStylings.json();
  // console.log(
  //   "checkoutProfileStylingsData",
  //   checkoutProfileStylingsData.data.checkoutBranding,
  // );

  const checkoutBranding = checkoutProfileStylingsData.data?.checkoutBranding;
  if (!checkoutBranding || !checkoutBranding.designSystem) {
    console.error("Checkout profile not found or missing design system");
    return json({
      success: false,
      errors: ["Checkout profile not found or missing design system"],
      checkoutProfileStylingsDataColors: null,
      checkoutId,
      shop,
    });
  }

  const checkoutProfileStylingsDataColors =
    checkoutBranding.designSystem.colors;
  const checkoutProfileStylingsDataColorsSchemes =
    checkoutProfileStylingsDataColors.schemes;

  const textAppearance = checkoutProfileStylingsDataColors.global;
  const cornerRadius = checkoutBranding.designSystem.cornerRadius;

  return json({
    success: true,
    checkoutProfileStylingsDataColors,
    checkoutProfileStylingsDataColorsSchemes,
    textAppearance,
    cornerRadius,
    checkoutId,
    shop,
  });
}

// Main Customization Component
export default function CustomizationSettings() {
  const {
    checkoutProfileStylingsDataColors,
    checkoutProfileStylingsDataColorsSchemes,
    textAppearance,
    cornerRadius,
    checkoutId,
    shop,
  } = useLoaderData();

  // console.log("shop", shop);
  console.log("checkoutId", checkoutId);

  console.log(
    // "checkoutProfileStylingsDataColors",
    // checkoutProfileStylingsDataColors,
    "checkoutProfileStylingsDataColorsSchemes",
    checkoutProfileStylingsDataColorsSchemes,
    // "textAppearance",
    // textAppearance,
    // "cornerRadius",
    // cornerRadius,
  );

  // console.log("scheme2", checkoutProfileStylingsDataColorsSchemes.scheme2);

  const scheme1 = checkoutProfileStylingsDataColors
    ? checkoutProfileStylingsDataColors.schemes.scheme1
    : null;
  const scheme2 = checkoutProfileStylingsDataColorsSchemes
    ? checkoutProfileStylingsDataColorsSchemes.scheme2
    : null;
  // console.log("scheme1", scheme1);
  console.log("scheme2", scheme2);

  const [selectedProfile, setSelectedProfile] = useState("default");
  const fetcher = useFetcher();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // State for selected nav item - OptionList onChange provides an array

  // Form state to track all color values
  const [colorValues, setColorValues] = useState({
    scheme1Background: scheme1 ? scheme1.base.background : "#ffffff",
    scheme1Foreground: scheme1 ? scheme1.base.text : "#545454",
    scheme1Accent:
      scheme1 && scheme1.base.accent ? scheme1.base.accent : "#1773b0",
    primaryButtonBackground: scheme1
      ? scheme1.primaryButton.background
      : "#1773b0",
    primaryButtonForeground: scheme1 ? scheme1.primaryButton.text : "#ffffff",
    primaryButtonAccent: scheme1 ? scheme1.primaryButton.accent : "#1773b0",
    primaryButtonBackgroundHover: scheme1
      ? scheme1.primaryButton.hover.background
      : "#2092e0",
    primaryButtonForegroundHover: scheme1
      ? scheme1.primaryButton.hover.text
      : "#ffffff",
    primaryButtonAccentHover: scheme1
      ? scheme1.primaryButton.hover.accent
      : "#1773b0",
    secondaryButtonBackground: scheme1
      ? scheme1.secondaryButton.background
      : "#ffffff",
    secondaryButtonForeground: scheme1
      ? scheme1.secondaryButton.text
      : "#1773b0",
    secondaryButtonAccent: scheme1 ? scheme1.secondaryButton.accent : "#1773b0",
    controlBackground: scheme1 ? scheme1.control.background : "#ffffff",
    controlForeground: scheme1 ? scheme1.control.text : "#545454",
    controlAccent: scheme1 ? scheme1.control.accent : "#1773b0",
    controlBorder: scheme1 ? scheme1.control.border : "#d9d9d9",

    // scheme2
    scheme2Background: scheme2 ? scheme2.base.background : "#f5f5f5",
    scheme2Foreground: scheme2 ? scheme2.base.text : "#545454",
    scheme2Accent: scheme2 ? scheme2.base.accent : "#1773b0",
    primaryButtonBackgroundScheme2: scheme2
      ? scheme2.primaryButton.background
      : "#1773b0",
    primaryButtonForegroundScheme2: scheme2
      ? scheme2.primaryButton.text
      : "#ffffff",
    primaryButtonAccentScheme2: scheme2
      ? scheme2.primaryButton.accent
      : "#1773b0",
    primaryButtonBackgroundHoverScheme2: scheme2
      ? scheme2.primaryButton.hover.background
      : "#2092e0",
    primaryButtonForegroundHoverScheme2: scheme2
      ? scheme2.primaryButton.hover.text
      : "#ffffff",
    primaryButtonAccentHoverScheme2: scheme2
      ? scheme2.primaryButton.hover.accent
      : "#1773b0",
    secondaryButtonBackgroundScheme2: scheme2
      ? scheme2.secondaryButton.background
      : "#ffffff",
    secondaryButtonForegroundScheme2: scheme2
      ? scheme2.secondaryButton.text
      : "#1773b0",
    secondaryButtonAccentScheme2: scheme2
      ? scheme2.secondaryButton.accent
      : "#1773b0",
    controlBackgroundScheme2: scheme2 ? scheme2.control.background : "#ffffff",
    controlForegroundScheme2: scheme2 ? scheme2.control.text : "#545454",
    controlAccentScheme2: scheme2 ? scheme2.control.accent : "#1773b0",
    controlBorderScheme2: scheme2 ? scheme2.control.border : "#d9d9d9",

    // textAppearance
    textAppearanceAccent: textAppearance ? textAppearance.accent : "#1773b0",
    textAppearanceInfo: textAppearance ? textAppearance.info : "#1773b0",
    textAppearanceSuccess: textAppearance ? textAppearance.success : "#0a801f",
    textAppearanceCritical: textAppearance
      ? textAppearance.critical
      : "#e01717",
    textAppearanceWarning: textAppearance ? textAppearance.warning : "#946c00",
    textAppearanceDecorative: textAppearance
      ? textAppearance.decorative
      : "#1773b0",
  });

  const [inputValue, setInputValue] = useState({
    cornerRadiusbBase: cornerRadius ? cornerRadius.base : 5,
    cornerRadiusSmall: cornerRadius ? cornerRadius.small : 2,
    cornerRadiusMedium: cornerRadius ? cornerRadius.large : 10,
  });

  // Update color value handler
  const handleColorChange = (field, value) => {
    setColorValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update input value handler
  const handleInputChange = (field, value) => {
    setInputValue((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectChange = useCallback(
    (value) => setSelectedProfile(value),
    [],
  );

  // Handle form submission
  const handleSaveColors = () => {
    const formData = new FormData();

    // Add all color values to form data
    Object.entries(colorValues).forEach(([key, value]) => {
      formData.append(key, value);
    });
    Object.entries(inputValue).forEach(([key, value]) => {
      formData.append(key, value);
    });

    fetcher.submit(formData, { method: "post", action: "/api/customization" });
  };

  // Add reset handler
  const handleReset = () => {
    fetcher.submit(
      { action: "reset" },
      { method: "post", action: "/api/customization" },
    );
  };

  // Handle response from action
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        setSuccessMessage("Checkout colors updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage(
          fetcher.data.error || "Failed to update checkout colors",
        );
        setTimeout(() => setErrorMessage(""), 5000);
      }
    }
  }, [fetcher.data]);

  const profileOptions = [
    { label: "Default Profile", value: "default" },
    { label: "Profile 1", value: "profile1" },
    // Add other profiles here
  ];

  const [selectedNavItem, setSelectedNavItem] = useState(["scheme1"]); // Initialize with array
  console.log("selectedNavItem", selectedNavItem);

  // custom handler and use setSelectedNavItem directly
  const handleOptionListChange = useCallback((selected) => {
    setSelectedNavItem(selected);
  }, []);

  // Define options for the OptionList
  const sidebarOptions = [
    {
      title: "Design system",
      options: [
        { value: "scheme1", label: "Scheme 1" },
        { value: "scheme2", label: "Scheme 2" },
        { value: "textAppearance", label: "Text appearance" },
        { value: "formsDesign", label: "Forms" },
      ],
    },
  ];

  // Function to handle View Page button click
  // Function to handle View Page button click
  const handleViewPage = useCallback(() => {
    if (!shop) return; // Add a guard clause
    const shopName = shop.replace(".myshopify.com", "");
    const profileId = checkoutId.replace("gid://shopify/CheckoutProfile/", "");
    const checkoutEditorUrl = `https://admin.shopify.com/store/${shopName}/settings/checkout/editor/profiles/${profileId}?page=checkout`;
    window.open(checkoutEditorUrl, "_blank");
  }, [shop, checkoutId]);

  return (
    <Page
      title="Customize Checkout Page"
      backAction={{ content: "back", url: "/app" }}
      primaryAction={
        <Button
          variant="primary"
          onClick={handleSaveColors}
          loading={fetcher.state !== "idle"}
        >
          Save
        </Button>
      }
      secondaryActions={
        <Button onClick={handleReset} loading={fetcher.state !== "idle"}>
          Reset to default
        </Button>
      }
    >
      {/* Success/Error Messages */}
      {successMessage && (
        <>
          <Banner
            title={successMessage}
            tone="success"
            onDismiss={() => setSuccessMessage("")}
          ></Banner>
          <br />
        </>
      )}
      {errorMessage && (
        <>
          <Banner tone="critical" onDismiss={() => setErrorMessage("")}>
            {errorMessage}
          </Banner>
          <br />
        </>
      )}
      {/* Settings Layout */}
      <Layout>
        {/* Sidebar Section using OptionList */}
        <Layout.Section variant="oneThird">
          <InlineStack>
            <Button
              fullWidth
              icon={ViewIcon}
              onClick={handleViewPage}
              variant="secondary"
            >
              View Page
            </Button>
          </InlineStack>
          <br />
          <Card padding="400">
            <div
              className=""
              style={{
                marginBottom: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <Text variant="headingMd" as="h2">
                Design system
              </Text>
              <Text as="p" color="subdued">
                Use for the main content area on the left side
              </Text>
            </div>
            <div>
              {sidebarOptions[0].options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setSelectedNavItem([option.value])}
                  style={{
                    padding: "12px 12px",
                    cursor: "pointer",
                    backgroundColor: selectedNavItem.includes(option.value)
                      ? "#eaf4ff"
                      : "transparent",
                    borderLeft: selectedNavItem.includes(option.value)
                      ? "3px solid #008060"
                      : "3px solid transparent",
                    transition: "background-color 0.2s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  <Text
                    variant="bodyMd"
                    fontWeight={
                      selectedNavItem.includes(option.value)
                        ? "semibold"
                        : "regular"
                    }
                    color={
                      selectedNavItem.includes(option.value)
                        ? "success"
                        : "subdued"
                    }
                  >
                    {option.label}
                  </Text>
                  <div style={{ width: "20px" }} className="">
                    <ChevronRightIcon />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>

        {/* Main Content Section */}
        <Layout.Section sectioned>

          {selectedNavItem.includes("scheme1") && (
            <Card>
              <BlockStack gap="500">
                {/* Scheme 1 Section */}
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Scheme 1 (Left side)
                  </Text>
                  <Text as="p" color="subdued">
                    Use for the main content area on the left side
                  </Text>
                  <InlineGrid columns={3} gap="400">
                    <ColorInput
                      label="Background"
                      value={colorValues.scheme1Background}
                      onChange={(value) =>
                        handleColorChange("scheme1Background", value)
                      }
                    />
                    <ColorInput
                      label="Foreground (Text)"
                      value={colorValues.scheme1Foreground}
                      onChange={(value) =>
                        handleColorChange("scheme1Foreground", value)
                      }
                    />
                    <ColorInput
                      label="Accent (Icons & indicators)"
                      value={colorValues.scheme1Accent}
                      onChange={(value) =>
                        handleColorChange("scheme1Accent", value)
                      }
                    />
                  </InlineGrid>
                </BlockStack>

                {/* Primary Button Section */}
                <BlockStack gap="300">
                  <InlineStack gap="100" blockAlign="center" wrap={false}>
                    <Text variant="headingMd" as="h2">
                      Primary button
                    </Text>
                    <Tooltip content="Use for primary action buttons">
                      <Icon source={QuestionCircleIcon} color="base" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="p" color="subdued">
                    Use for primary action buttons
                  </Text>
                  <InlineGrid columns={3} gap="400">
                    <ColorInput
                      label="Background"
                      value={colorValues.primaryButtonBackground}
                      onChange={(value) =>
                        handleColorChange("primaryButtonBackground", value)
                      }
                    />
                    <ColorInput
                      label="Foreground (Text)"
                      value={colorValues.primaryButtonForeground}
                      onChange={(value) =>
                        handleColorChange("primaryButtonForeground", value)
                      }
                    />
                    <ColorInput
                      label="Accent (Icons & indicators)"
                      value={colorValues.primaryButtonAccent}
                      onChange={(value) =>
                        handleColorChange("primaryButtonAccent", value)
                      }
                    />
                  </InlineGrid>
                  <InlineGrid columns={3} gap="400">
                    <ColorInput
                      label="Background (Hover)"
                      value={colorValues.primaryButtonBackgroundHover}
                      onChange={(value) =>
                        handleColorChange("primaryButtonBackgroundHover", value)
                      }
                    />
                    <ColorInput
                      label="Foreground (Hover)"
                      value={colorValues.primaryButtonForegroundHover}
                      onChange={(value) =>
                        handleColorChange("primaryButtonForegroundHover", value)
                      }
                    />
                    <ColorInput
                      label="Accent (Hover)"
                      value={colorValues.primaryButtonAccentHover}
                      onChange={(value) =>
                        handleColorChange("primaryButtonAccentHover", value)
                      }
                    />
                  </InlineGrid>
                </BlockStack>

                {/* Secondary Button Section */}
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Secondary button
                  </Text>
                  <Text as="p" color="subdued">
                    Use for secondary action buttons
                  </Text>
                  <InlineGrid columns={3} gap="400">
                    <ColorInput
                      label="Background"
                      value={colorValues.secondaryButtonBackground}
                      onChange={(value) =>
                        handleColorChange("secondaryButtonBackground", value)
                      }
                    />
                    <ColorInput
                      label="Foreground (Text)"
                      value={colorValues.secondaryButtonForeground}
                      onChange={(value) =>
                        handleColorChange("secondaryButtonForeground", value)
                      }
                    />
                    <ColorInput
                      label="Accent (Icons & indicators)"
                      value={colorValues.secondaryButtonAccent}
                      onChange={(value) =>
                        handleColorChange("secondaryButtonAccent", value)
                      }
                    />
                  </InlineGrid>
                </BlockStack>

                {/* Control Color Section */}
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Control color
                  </Text>
                  <Text as="p" color="subdued">
                    Use for form controls (such as input fields, checkboxes, and
                    dropdowns)
                  </Text>
                  <InlineGrid columns={2} gap="400">
                    <ColorInput
                      label="Background"
                      value={colorValues.controlBackground}
                      onChange={(value) =>
                        handleColorChange("controlBackground", value)
                      }
                    />
                    <ColorInput
                      label="Foreground (Text)"
                      value={colorValues.controlForeground}
                      onChange={(value) =>
                        handleColorChange("controlForeground", value)
                      }
                    />
                    <ColorInput
                      label="Accent (Icons & indicators)"
                      value={colorValues.controlAccent}
                      onChange={(value) =>
                        handleColorChange("controlAccent", value)
                      }
                    />
                    <ColorInput
                      label="Border"
                      value={colorValues.controlBorder}
                      onChange={(value) =>
                        handleColorChange("controlBorder", value)
                      }
                    />
                  </InlineGrid>
                </BlockStack>
              </BlockStack>
            </Card>
          )}

          {selectedNavItem.includes("scheme2") && (
            <Schema2
              colorValues={colorValues}
              handleColorChange={handleColorChange}
            />
          )}

          {selectedNavItem.includes("textAppearance") && (
            <TextAppearance
              colorValues={colorValues}
              handleColorChange={handleColorChange}
            />
          )}
          {selectedNavItem.includes("formsDesign") && (
            <FormsDesign
              colorValues={colorValues}
              handleColorChange={handleColorChange}
              handleInputChange={handleInputChange}
              inputValue={inputValue}
            />
          )}
        </Layout.Section>
      </Layout>
      <br />
      <br />
    </Page>
  );
}

// Helper component for Color Input Field
function ColorInput({ label, value, helpText, onChange }) {
  const [fieldValue, setFieldValue] = useState(value);
  const [popoverActive, setPopoverActive] = useState(false);
  const [color, setColor] = useState({
    hue: 0,
    brightness: 1,
    saturation: 1,
  });

  // Basic validation for hex color
  const isValidHex = /^$|^#([0-9A-Fa-f]{3}){1,2}$/.test(fieldValue);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    [],
  );

  const handleValueChange = useCallback(
    (newValue) => {
      setFieldValue(newValue);
      if (onChange) onChange(newValue);
    },
    [onChange],
  );

  const handleColorChange = useCallback(
    (color) => {
      setColor(color);

      // Convert HSB to hex
      const { hue, brightness, saturation } = color;

      let r, g, b;

      const h = hue / 360;
      const s = saturation;
      const v = brightness;

      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      switch (i % 6) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        case 5:
          r = v;
          g = p;
          b = q;
          break;
      }

      const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };

      const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      setFieldValue(hexColor);
      if (onChange) onChange(hexColor);
    },
    [onChange],
  );

  const activator = (
    <div
      onClick={togglePopoverActive}
      style={{
        cursor: "pointer",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "1px solid var(--p-border-subdued)",
        backgroundColor:
          isValidHex && fieldValue ? fieldValue : "var(--p-surface-disabled)",
        transition: "border-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--p-border-hovered)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--p-border-subdued)";
      }}
    />
  );

  return (
    <BlockStack gap="100">
      <InlineStack gap="100" blockAlign="center" wrap={false}>
        <Text as="p" variant="bodyMd">
          {label}
        </Text>
        {helpText && (
          <Tooltip content={helpText}>
            <Icon source={QuestionCircleIcon} color="base" />
          </Tooltip>
        )}
      </InlineStack>
      <InlineStack gap="200" wrap={false} blockAlign="center">
        <div style={{ flexGrow: 1 }}>
          <TextField
            label={label}
            labelHidden
            value={fieldValue}
            onChange={handleValueChange}
            autoComplete="off"
            error={
              !isValidHex && fieldValue !== "" ? "Invalid hex color" : undefined
            }
          />
        </div>
        <div
          className="pop_box"
          style={{ border: "1px solid #ccc", borderRadius: "50%" }}
        >
          <Popover
            active={popoverActive}
            activator={
              <div
                onClick={togglePopoverActive}
                style={{
                  cursor: "pointer",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "1px solid var(--p-border-subdued)",
                  backgroundColor:
                    isValidHex && fieldValue
                      ? fieldValue
                      : "var(--p-surface-disabled)",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--p-border-hovered)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--p-border-subdued)";
                }}
              />
            }
            onClose={togglePopoverActive}
            preferredAlignment="right"
          >
            <div style={{ padding: "22px" }}>
              <ColorPicker onChange={handleColorChange} color={color} />
            </div>
          </Popover>
        </div>
      </InlineStack>
    </BlockStack>
  );
}

function Schema2({ colorValues, handleColorChange }) {
  return (
    <Card>
      <BlockStack gap="500">
        {/* Scheme 1 Section */}
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Scheme 2 (Right side)
          </Text>
          <Text as="p" color="subdued">
            Use for the main content area on the left side
          </Text>
          <InlineGrid columns={3} gap="400">
            <ColorInput
              label="Background"
              value={colorValues.scheme2Background}
              onChange={(value) =>
                handleColorChange("scheme2Background", value)
              }
            />
            <ColorInput
              label="Foreground (Text)"
              value={colorValues.scheme2Foreground}
              onChange={(value) =>
                handleColorChange("scheme2Foreground", value)
              }
            />
            <ColorInput
              label="Accent (Icons & indicators)"
              value={colorValues.scheme2Accent}
              onChange={(value) => handleColorChange("scheme2Accent", value)}
            />
          </InlineGrid>
        </BlockStack>

        {/* Primary Button Section */}
        <BlockStack gap="300">
          <InlineStack gap="100" blockAlign="center" wrap={false}>
            <Text variant="headingMd" as="h2">
              Primary button
            </Text>
            <Tooltip content="Use for primary action buttons">
              <Icon source={QuestionCircleIcon} color="base" />
            </Tooltip>
          </InlineStack>
          <Text as="p" color="subdued">
            Use for primary action buttons
          </Text>
          <InlineGrid columns={3} gap="400">
            <ColorInput
              label="Background"
              value={colorValues.primaryButtonBackgroundScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonBackgroundScheme2", value)
              }
            />
            <ColorInput
              label="Foreground (Text)"
              value={colorValues.primaryButtonForegroundScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonForegroundScheme2", value)
              }
            />
            <ColorInput
              label="Accent (Icons & indicators)"
              value={colorValues.primaryButtonAccentScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonAccentScheme2", value)
              }
            />
          </InlineGrid>
          <InlineGrid columns={3} gap="400">
            <ColorInput
              label="Background (Hover)"
              value={colorValues.primaryButtonBackgroundHoverScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonBackgroundHoverScheme2", value)
              }
            />
            <ColorInput
              label="Foreground (Hover)"
              value={colorValues.primaryButtonForegroundHoverScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonForegroundHoverScheme2", value)
              }
            />
            <ColorInput
              label="Accent (Hover)"
              value={colorValues.primaryButtonAccentHoverScheme2}
              onChange={(value) =>
                handleColorChange("primaryButtonAccentHoverScheme2", value)
              }
            />
          </InlineGrid>
        </BlockStack>

        {/* Secondary Button Section */}
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Secondary button
          </Text>
          <Text as="p" color="subdued">
            Use for secondary action buttons
          </Text>
          <InlineGrid columns={3} gap="400">
            <ColorInput
              label="Background"
              value={colorValues.secondaryButtonBackgroundScheme2}
              onChange={(value) =>
                handleColorChange("secondaryButtonBackgroundScheme2", value)
              }
            />
            <ColorInput
              label="Foreground (Text)"
              value={colorValues.secondaryButtonForegroundScheme2}
              onChange={(value) =>
                handleColorChange("secondaryButtonForegroundScheme2", value)
              }
            />
            <ColorInput
              label="Accent (Icons & indicators)"
              value={colorValues.secondaryButtonAccentScheme2}
              onChange={(value) =>
                handleColorChange("secondaryButtonAccentScheme2", value)
              }
            />
          </InlineGrid>
        </BlockStack>

        {/* Control Color Section */}
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Control color
          </Text>
          <Text as="p" color="subdued">
            Use for form controls (such as input fields, checkboxes, and
            dropdowns)
          </Text>
          <InlineGrid columns={2} gap="400">
            <ColorInput
              label="Background"
              value={colorValues.controlBackgroundScheme2}
              onChange={(value) =>
                handleColorChange("controlBackgroundScheme2", value)
              }
            />
            <ColorInput
              label="Foreground (Text)"
              value={colorValues.controlForegroundScheme2}
              onChange={(value) =>
                handleColorChange("controlForegroundScheme2", value)
              }
            />
            <ColorInput
              label="Accent (Icons & indicators)"
              value={colorValues.controlAccentScheme2}
              onChange={(value) =>
                handleColorChange("controlAccentScheme2", value)
              }
            />
            <ColorInput
              label="Border"
              value={colorValues.controlBorder}
              onChange={(value) =>
                handleColorChange("controlBorderScheme2", value)
              }
            />
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

// Text Apperance Component
function TextAppearance({ colorValues, handleColorChange }) {
  return (
    <Card>
      <BlockStack gap="500">
        {/* Scheme 1 Section */}
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Text appearance
          </Text>
          <Text as="p" color="subdued">
            Use for text color
          </Text>
          <InlineGrid columns={3} gap="400">
            <ColorInput
              label="Accent"
              value={colorValues.textAppearanceAccent}
              onChange={(value) =>
                handleColorChange("textAppearanceAccent", value)
              }
            />
            <ColorInput
              label="Info"
              value={colorValues.textAppearanceInfo}
              onChange={(value) =>
                handleColorChange("textAppearanceInfo", value)
              }
            />
            <ColorInput
              label="Success"
              value={colorValues.textAppearanceSuccess}
              onChange={(value) =>
                handleColorChange("textAppearanceSuccess", value)
              }
            />
            <ColorInput
              label="Critical"
              value={colorValues.textAppearanceCritical}
              onChange={(value) =>
                handleColorChange("textAppearanceCritical", value)
              }
            />
            <ColorInput
              label="Warning"
              value={colorValues.textAppearanceWarning}
              onChange={(value) =>
                handleColorChange("textAppearanceWarning", value)
              }
            />
            <ColorInput
              label="Decorative"
              value={colorValues.textAppearanceDecorative}
              onChange={(value) =>
                handleColorChange("textAppearanceDecorative", value)
              }
            />
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

// Forms Component
function FormsDesign({ inputValue, handleInputChange }) {
  return (
    <Card>
      <BlockStack gap="500">
        {/* Scheme 1 Section */}
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Corner Radius
          </Text>
          <Text as="p" color="subdued">
            Readonly. These are standard corner radius to apply to form
            elements. You can change the elements corner radius by select these
            options in the Forms customize tab.{" "}
          </Text>
          <InlineGrid columns={3} gap="400">
            <TextField
              type="number"
              name="cornerRadiusbBase"
              value={inputValue.cornerRadiusbBase}
              onChange={(value) =>
                handleInputChange("cornerRadiusbBase", value)
              }
              autoComplete="off"
              helpText="Base"
              suffix="px"
            />
            <TextField
              type="number"
              name="cornerRadiusMedium"
              value={inputValue.cornerRadiusMedium}
              onChange={(value) =>
                handleInputChange("cornerRadiusMedium", value)
              }
              autoComplete="off"
              helpText="Medium"
              suffix="px"
            />
            <TextField
              type="number"
              name="cornerRadiusSmall"
              value={inputValue.cornerRadiusSmall}
              onChange={(value) =>
                handleInputChange("cornerRadiusSmall", value)
              }
              autoComplete="off"
              helpText="Small"
              suffix="px"
            />
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
