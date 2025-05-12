import { authenticate } from "../shopify.server";
import { json } from "@remix-run/react";

// Add action function to handle form submission
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  console.log("Form Data:", formData);

  // fetch checkout profile id
  const checkoutProfileId = await admin.graphql(`
        query {
        checkoutProfiles(first: 1, query: "is_published:true") {
            nodes{
            id
            }
        }
    }`);

  const checkoutProfileIdData = await checkoutProfileId.json();
  const checkoutId = checkoutProfileIdData.data.checkoutProfiles.nodes[0].id;
  console.log("checkoutId", checkoutId);

  // Check if this is a reset action
  if (formData.get("action") === "reset") {
    const resetResponse = await admin.graphql(
      `
      mutation ResetCheckoutStyles($checkoutProfileId: ID!) {
        checkoutBrandingUpsert(checkoutProfileId: $checkoutProfileId, checkoutBrandingInput: null) {
          userErrors {
            field
            message
          }
        }
      }
      `,
      {
        variables: {
          checkoutProfileId: checkoutId,
        },
      },
    );

    const resetData = await resetResponse.json();

    if (resetData.data?.checkoutBrandingUpsert?.userErrors?.length > 0) {
      return json({
        success: false,
        errors: resetData.data.checkoutBrandingUpsert.userErrors,
      });
    }

    return json({ success: true });
  }

  // Extract color values from form data
  const colorSettings = {
    scheme1: {
      background: formData.get("scheme1Background"),
      foreground: formData.get("scheme1Foreground"),
      accent: formData.get("scheme1Accent"),
    },
    primaryButton: {
      background: formData.get("primaryButtonBackground"),
      foreground: formData.get("primaryButtonForeground"),
      accent: formData.get("primaryButtonAccent"),
      backgroundHover: formData.get("primaryButtonBackgroundHover"),
      foregroundHover: formData.get("primaryButtonForegroundHover"),
      accentHover: formData.get("primaryButtonAccent"),
    },
    secondaryButton: {
      background: formData.get("secondaryButtonBackground"),
      backgroundHover: formData.get("secondaryButtonBackground"),
      foreground: formData.get("secondaryButtonForeground"),
      accent: formData.get("secondaryButtonAccent"),
    },
    control: {
      background: formData.get("controlBackground"),
      foreground: formData.get("controlForeground"),
      accent: formData.get("controlAccent"),
      border: formData.get("controlBorder"),
    },

    schema2: {
      schema2Background: formData.get("scheme2Background"),
      schema2Foreground: formData.get("scheme2Foreground"),
      schema2Accent: formData.get("scheme2Accent"),

      primaryButtonBackgroundScheme2: formData.get(
        "primaryButtonBackgroundScheme2",
      ),
      primaryButtonForegroundScheme2: formData.get(
        "primaryButtonForegroundScheme2",
      ),
      primaryButtonAccentScheme2: formData.get("primaryButtonAccentScheme2"),
      primaryButtonBackgroundHoverScheme2: formData.get(
        "primaryButtonBackgroundHoverScheme2",
      ),
      primaryButtonForegroundHoverScheme2: formData.get(
        "primaryButtonForegroundHoverScheme2",
      ),
      primaryButtonAccentHoverScheme2: formData.get(
        "primaryButtonAccentHoverScheme2",
      ),

      secondaryButtonBackgroundScheme2: formData.get(
        "secondaryButtonBackgroundScheme2",
      ),
      secondaryButtonForegroundScheme2: formData.get(
        "secondaryButtonForegroundScheme2",
      ),
      secondaryButtonAccentScheme2: formData.get(
        "secondaryButtonAccentScheme2",
      ),

      controlBackgroundScheme2: formData.get("controlBackgroundScheme2"),
      controlForegroundScheme2: formData.get("controlForegroundScheme2"),
      controlAccentScheme2: formData.get("controlAccentScheme2"),
      controlBorderScheme2: formData.get("controlBorderScheme2"),
    },
    textAppearance: {
      accent: formData.get("textAppearanceAccent"),
      info: formData.get("textAppearanceInfo"),
      success: formData.get("textAppearanceSuccess"),
      critical: formData.get("textAppearanceCritical"),
      warning: formData.get("textAppearanceWarning"),
      decorative: formData.get("textAppearanceDecorative"),
    },
    cornerRadius: {
      base: formData.get("cornerRadiusbBase"),
      small: formData.get("cornerRadiusSmall"),
      large: formData.get("cornerRadiusMedium"),
    },
  };

  console.log("colorSettings", colorSettings);

  try {
    // return true;

    // Update checkout appearance via GraphQL
    const response = await admin.graphql(
      `
          mutation ChangeColorScheme1($checkoutBrandingInput: CheckoutBrandingInput!, $checkoutProfileId: ID!) {
              checkoutBrandingUpsert(checkoutBrandingInput: $checkoutBrandingInput, checkoutProfileId: $checkoutProfileId) {
                  checkoutBranding {
                  designSystem {
                  colors {
                      schemes {
                      scheme1 {
                          base {
                          background
                          text
                          }
                          control {
                          background
                          border
                          selected {
                              background
                              border
                          }
                          }
                          primaryButton {
                          hover {
                              background
                          }
                          }
                      }
                      }
                  }
                  }
                  }
                  userErrors {
                  field
                  message
                  }
              }
          }
          `,
      {
        variables: {
          checkoutProfileId: checkoutId,
          checkoutBrandingInput: {
            designSystem: {
              colors: {
                schemes: {
                  scheme1: {
                    base: {
                      background: colorSettings.scheme1.background,
                      text: colorSettings.scheme1.foreground,
                    },
                    control: {
                      background: colorSettings.control.background,
                      border: colorSettings.control.border,
                      accent: colorSettings.control.accent,
                      text: colorSettings.control.foreground,
                    },
                    primaryButton: {
                      background: colorSettings.primaryButton.background,
                      text: colorSettings.primaryButton.foreground,
                      accent: colorSettings.primaryButton.accent,
                      hover: {
                        background: colorSettings.primaryButton.backgroundHover,
                        text: colorSettings.primaryButton.foreground,
                        accent: colorSettings.primaryButton.accent,
                      },
                    },
                    secondaryButton: {
                      background: colorSettings.secondaryButton.background,
                      text: colorSettings.secondaryButton.foreground,
                      accent: colorSettings.secondaryButton.accent,
                      hover: {
                        background:
                          colorSettings.secondaryButton.backgroundHover,
                      },
                    },
                  },
                  scheme2: {
                    base: {
                      background: colorSettings.schema2.schema2Background,
                      text: colorSettings.schema2.schema2Foreground,
                      accent: colorSettings.schema2.schema2Accent,
                    },
                    control: {
                      background:
                        colorSettings.schema2.controlBackgroundScheme2,
                      border: colorSettings.schema2.controlBorderScheme2,
                      accent: colorSettings.schema2.controlAccentScheme2,
                      text: colorSettings.schema2.controlForegroundScheme2,
                    },
                    primaryButton: {
                      background:
                        colorSettings.schema2.primaryButtonBackgroundScheme2,
                      text: colorSettings.schema2
                        .primaryButtonForegroundScheme2,
                      accent: colorSettings.schema2.primaryButtonAccentScheme2,
                      hover: {
                        background:
                          colorSettings.schema2
                            .primaryButtonBackgroundHoverScheme2,
                        text: colorSettings.schema2
                          .primaryButtonForegroundHoverScheme2,
                        accent:
                          colorSettings.schema2.primaryButtonAccentHoverScheme2,
                      },
                    },
                    secondaryButton: {
                      background:
                        colorSettings.schema2.secondaryButtonBackgroundScheme2,
                      text: colorSettings.schema2
                        .secondaryButtonForegroundScheme2,
                      accent:
                        colorSettings.schema2.secondaryButtonAccentScheme2,
                    },
                  },
                },
                global: {
                  info: colorSettings.textAppearance.info,
                  accent: colorSettings.textAppearance.accent,
                  success: colorSettings.textAppearance.success,
                  warning: colorSettings.textAppearance.warning,
                  critical: colorSettings.textAppearance.critical,
                  decorative: colorSettings.textAppearance.decorative,
                },
              },
              cornerRadius: {
                base: parseInt(colorSettings.cornerRadius.base),
                small: parseInt(colorSettings.cornerRadius.small),
                large: parseInt(colorSettings.cornerRadius.large),
              },
            },
          },
        },
      },
    );

    const responseData = await response.json();

    if (responseData.data?.checkoutBrandingUpsert?.userErrors?.length > 0) {
      return json({
        success: false,
        errors: responseData.data.checkoutBrandingUpsert.userErrors,
      });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error updating checkout branding:", error);
    return json({ success: false, error: error.message });
  }
}
