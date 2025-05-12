import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { json } from "@remix-run/react";

// Action function to handle form submissions
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action");
  const shopId = formData.get("shopId");
  const upsellId = formData.get("upsellId");

  if (action === "saveUpsellSettings" || action === "updateUpsellSettings") {
    try {
      const settings = {
        upsellName: formData.get("upsellName"),
        selectedProducts: JSON.parse(formData.get("selectedProducts")),
        selectedCollections: JSON.parse(formData.get("selectedCollections")),
        upsellProducts: JSON.parse(formData.get("upsellProducts")),
        selectionType: formData.get("selectionType") || "specific",
      };

      console.log("settings:", settings);

      // Validate upsell name
      if (!settings.upsellName) {
        throw new Error("Upsell name is required");
      }

      let dbSettings;
      
      // Check if we're updating an existing upsell
      if (upsellId && action === "updateUpsellSettings") {
        // Update existing upsell by ID
        dbSettings = await prisma.upsellSettings.update({
          where: {
            id: parseInt(upsellId),
          },
          data: {
            shopId: shopId,
            upsellName: settings.upsellName,
            selectedProducts: JSON.stringify(settings.selectedProducts),
            selectedCollections: JSON.stringify(settings.selectedCollections),
            upsellProducts: JSON.stringify(settings.upsellProducts),
            selectionType: settings.selectionType,
          },
        });
      } else {
        // Create or update by upsell name (existing behavior)
        dbSettings = await prisma.upsellSettings.upsert({
          where: {
            upsellName: settings.upsellName,
          },
          update: {
            shopId: shopId,
            selectedProducts: JSON.stringify(settings.selectedProducts),
            selectedCollections: JSON.stringify(settings.selectedCollections),
            upsellProducts: JSON.stringify(settings.upsellProducts),
            selectionType: settings.selectionType,
          },
          create: {  
            shopId: shopId,
            upsellName: settings.upsellName,
            selectedProducts: JSON.stringify(settings.selectedProducts),
            selectedCollections: JSON.stringify(settings.selectedCollections),
            upsellProducts: JSON.stringify(settings.upsellProducts),
            selectionType: settings.selectionType,
          },
        });
      }

      const metaData = {
        shopId: shopId,
        upsellName: formData.get("upsellName"),
        selectedProducts: JSON.parse(formData.get("selectedProducts")),
        selectedCollections: JSON.parse(formData.get("selectedCollections")),
        upsellProducts: JSON.parse(formData.get("upsellProducts")),
        selectionType: formData.get("selectionType") || "specific",
      };

      let metafieldResult = null;
      // Determine where to save the metafield
      let ownerId = shopId;
      // If specific products are selected and selectionType is not "all",
      // we could save to each product's metafield instead of shop
      // This is just a placeholder - you'd need to implement the logic to save to each product
      if (
        settings.selectedProducts.length > 0 &&
        settings.selectionType !== "all"
      ) {
        // For now, we'll still save to the shop, but you could modify this
        // to save to each product if needed
        console.log("Selected products, but selectionType is not 'all'");
        // console.log(settings.selectedProducts[0], settings.selectedProducts[1], settings.selectedProducts[2])
        console.log(JSON.stringify(settings.selectedProducts));
        ownerId = shopId;

        const productIds = settings.selectedProducts; // Replace with your product IDs

        const metafieldData = {
          key: "upsell",
          namespace: "settings",
          type: "json",
          value: JSON.stringify(metaData), // Replace with your JSON data
        };

        for (const productId of productIds) {
          const metafieldResponse = await admin.graphql(
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
                    ...metafieldData,
                    ownerId: productId,
                  },
                ],
              },
            },
          );
          console.log(`Metafield added to product ${productId}: metafieldResponse:`, metafieldResponse);
        }

        return json({
          success: true,
        });
      }

      if (
        settings.selectedProducts.length == 0 &&
        settings.selectionType == "all"
      ) {
        // Save settings to the metafield
        const metafieldResponse = await admin.graphql(
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
                  key: "upsell",
                  namespace: "settings",
                  ownerId: ownerId,
                  type: "json",
                  value: JSON.stringify(metaData),
                },
              ],
            },
          },
        );

        metafieldResult = await metafieldResponse.json();

        // Check for errors in the metafield update
        if (metafieldResult.data?.metafieldsSet?.userErrors?.length > 0) {
          console.error(
            "Metafield errors:",
            metafieldResult.data.metafieldsSet.userErrors,
          );
          throw new Error(
            metafieldResult.data.metafieldsSet.userErrors[0].message,
          );
        }

        return json({
          success: true,
          data: {
            database: dbSettings,
            metafieldResult: metafieldResult,
          },
        });
      }  
      
      return json({
        success: true,
        data: {
          database: dbSettings,
          metafieldResult: metafieldResult,
        },
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      return json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
}
