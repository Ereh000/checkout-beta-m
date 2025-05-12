// createupsell.jsx
import {
  Card,
  TextField,
  Text,
  Page,
  Layout,
  LegacyCard,
  Button,
  Banner,
} from "@shopify/polaris";
import { useState, createContext, useContext } from "react";
import { authenticate } from "../shopify.server";
import { useLoaderData, useFetcher, json } from "@remix-run/react";
import prisma from "../db.server";

// Create a context to share data between components
export const UpsellContext = createContext({
  upsellData: {
    upsellName: "",
    conditions: {
      selectedProducts: [],
      selectedCollections: [],
      selectionType: "", // Add this line - can be "all" or "specific"
    },
    upsellProducts: ["", "", ""],
  },
  setUpsellData: () => {},
});

// Loader function to fetch initial data
export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const upsellId = url.searchParams.get("id");

    const response = await admin.graphql(`
      query {
        shop {
          id
        }
        products(first: 50) {
          edges {
            node {
              id
              title
            }
          }
        }
        collections(first: 10) {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `);
    const data = await response.json();

    // Check if there's already an upsell with "all" selection type
    const existingAllTypeUpsell = await prisma.upsellSettings.findFirst({
      where: {
        shopId: data.data.shop.id,
        selectionType: "all",
      },
    });

    // Fetch existing upsells for this shop
    const existingUpsells = await prisma.upsellSettings.findMany({
      where: {
        shopId: data.data.shop.id,
      },
      select: {
        upsellName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If upsellId is provided, fetch the specific upsell details
    let upsellDetails = null;
    if (upsellId) {
      upsellDetails = await prisma.upsellSettings.findUnique({
        where: {
          id: parseInt(upsellId),
        },
      });
    }

    return {
      products: data.data.products,
      collections: data.data.collections,
      shopId: data.data.shop.id,
      existingUpsells: existingUpsells,
      existingAllTypeUpsell: !!existingAllTypeUpsell,
      upsellDetails: upsellDetails,
    };
  } catch (error) {
    // console.error("Loader error:", error.message);
    return json(
      { error: "An error occurred while loading data.", success: false },
      { status: 500 },
    );
  }
}

// Main component
export default function MainCreatUpsell() {
  const { shopId, products, collections, upsellDetails } = useLoaderData();

  // Safe JSON parse function
  const safeJsonParse = (jsonString, defaultValue) => {
    if (!jsonString) return defaultValue;
    if (typeof jsonString !== "string") return jsonString;

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error, jsonString);
      return defaultValue;
    }
  };

  // Initialize state with upsellDetails if available
  const [upsellData, setUpsellData] = useState({
    upsellName: upsellDetails?.upsellName || "",
    conditions: {
      selectedProducts: safeJsonParse(upsellDetails?.selectedProducts, []),
      selectedCollections: safeJsonParse(
        upsellDetails?.selectedCollections,
        [],
      ),
      selectionType: upsellDetails?.selectionType || "",
    },
    upsellProducts: safeJsonParse(upsellDetails?.upsellProducts, ["", "", ""]),
  });
  // console.log("upsellData:", upsellData);

  // Determine if we're in edit mode
  const isEditMode = !!upsellDetails;
  const pageTitle = isEditMode ? "Edit Upsell" : "Create Upsell";

  return (
    <UpsellContext.Provider value={{ upsellData, setUpsellData }}>
      <Page
        title={pageTitle}
        backAction={{ content: "Back", url: "/app/manage-upsell" }}
      >
        <Layout>
          <Layout.Section>
            <Banner title="Note:" onDismiss={() => {}}>
              <p>
                After selecting the product you want to upsell, make sure to
                finish setting up your upsells by adding our upsell extension in
                the checkout editor. Please contact us if you need assistance.
              </p>
            </Banner>
            <br />
            <CreateUpsell />
            <br />
            <ConditionToDisplayUpsellSection
              products={products}
              collections={collections}
            />
            <br />
            <SelectProductForUpsell shopId={shopId} products={products} />
          </Layout.Section>
          <br />
          <Layout.Section variant="oneThird">
            <LegacyCard title="Tags" sectioned>
              <p>Add tags to your order.</p>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
      <br />
      <br />
      <br />
    </UpsellContext.Provider>
  );
}

// Step #1: Name Your Upsell
export function CreateUpsell() {
  const { upsellData, setUpsellData } = useContext(UpsellContext);

  const handleNameChange = (value) => {
    setUpsellData((prev) => ({
      ...prev,
      upsellName: value,
    }));
  };

  return (
    <Card>
      <Text as="h3" variant="headingMd">
        Step #1: Name Your Upsell
      </Text>
      <div style={{ height: "6px" }}></div>
      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "5px" }}>
        Upsell Name
      </p>
      <TextField
        placeholder="Example: Upsell our best product"
        value={upsellData.upsellName}
        onChange={handleNameChange}
        style={{ width: "100%" }}
      />
      <p style={{ marginTop: "5px", fontSize: "12px", color: "#6B7280" }}>
        This is not visible to the customer
      </p>
    </Card>
  );
}

// Step #2: Condition To Display Upsell
export function ConditionToDisplayUpsellSection({ products, collections }) {
  const { upsellData, setUpsellData } = useContext(UpsellContext);
  // Remove modal state:
  // const [modalOpen, setModalOpen] = useState(false);
  // const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const { existingAllTypeUpsell } = useLoaderData();
  const allProductsDisabled = existingAllTypeUpsell;

  const fetcher = useFetcher();

  // Remove handleSelection and toggleModal as they are replaced by resource picker logic

  // Function to open product resource picker
  const handleProductResourcePicker = async () => {
    try {
      const result = await window.shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true, // Allow selecting multiple products
        initialSelectionIds: upsellData.conditions.selectedProducts.map(
          (id) => ({ id }),
        ), // Pre-select existing ones
        filter: {
          hidden: true,
          variants: false,
          draft: false,
          archived: false,
        },
      });
      if (result) {
        const selectedProductIds = result.map((product) => product.id);
        setUpsellData((prev) => ({
          ...prev,
          conditions: {
            ...prev.conditions,
            selectedProducts: selectedProductIds,
            selectionType: "specific", // Ensure selection type is specific
            selectedCollections: [], // Clear collections when selecting products
          },
        }));
      }
    } catch (error) {
      console.error("Error selecting products:", error);
    }
  };

  // Function to open collection resource picker
  const handleCollectionResourcePicker = async () => {
    try {
      const result = await window.shopify.resourcePicker({
        type: "collection",
        action: "select",
        multiple: true, // Allow selecting multiple collections
        initialSelectionIds: upsellData.conditions.selectedCollections.map(
          (id) => ({ id }),
        ), // Pre-select existing ones
      });
      if (result) {
        const selectedCollectionIds = result.map((collection) => collection.id);
        setUpsellData((prev) => ({
          ...prev,
          conditions: {
            ...prev.conditions,
            selectedCollections: selectedCollectionIds,
            selectionType: "specific", // Ensure selection type is specific
            selectedProducts: [], // Clear products when selecting collections
          },
        }));
      }
    } catch (error) {
      console.error("Error selecting collections:", error);
    }
  };

  const getSelectedProductTitles = () => {
    // Use the full products list passed as prop to find titles
    return products?.edges
      ?.filter((product) =>
        upsellData.conditions.selectedProducts.includes(product.node.id),
      )
      .map((product) => product.node.title);
  };

  const getSelectedCollectionTitles = () => {
    // Use the full collections list passed as prop to find titles
    return collections?.edges
      ?.filter((collection) =>
        upsellData.conditions.selectedCollections.includes(collection.node.id),
      )
      .map((collection) => collection.node.handle); // Use handle or title as needed
  };

  // Remove renderModal function

  const handleConditionSelect = (type) => {
    setUpsellData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        selectionType: type === "all" ? "all" : "specific",
        // Clear selections when switching to 'all' or 'none'
        selectedProducts:
          type === "all" || type === "none"
            ? []
            : prev.conditions.selectedProducts,
        selectedCollections:
          type === "all" || type === "none"
            ? []
            : prev.conditions.selectedCollections,
      },
    }));
  };

  return (
    <Card
      style={{
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
      }}
    >
      <Text as="h3" variant="headingMd">
        Step #2: Condition To Display Upsell
      </Text>
      <Text style={{ marginTop: "5px", fontSize: "14px", color: "#6B7280" }}>
        This will be used as the trigger for displaying the upsell
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        <Card>
          <Text fontWeight="bold">All Products</Text>
          <div
            style={{ marginTop: "8px", marginBottom: "8px", minHeight: "40px" }}
          >
            {" "}
            {/* Added minHeight */}
            {upsellData.conditions.selectionType === "all" && (
              <Text color="subdued" as="span">
                All products will trigger this upsell
                <br />
              </Text>
            )}
            {allProductsDisabled && (
              <Text color="critical" as="span">
                Another upsell is already using "All Products"
                <br />
              </Text>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              plain
              fullWidth
              onClick={() => handleConditionSelect("all")}
              disabled={allProductsDisabled}
            >
              {upsellData.conditions.selectionType === "all"
                ? "Selected"
                : "Select"}
            </Button>
            {upsellData.conditions.selectionType === "all" && (
              <Button
                plain
                destructive
                onClick={() => handleConditionSelect("none")} // Reset selection type
              >
                ✕
              </Button>
            )}
          </div>
        </Card>
        <Card>
          <Text fontWeight="bold">Based on product in cart</Text>
          <div
            style={{ marginTop: "8px", marginBottom: "8px", minHeight: "40px" }}
          >
            {" "}
            {/* Added minHeight */}
            {getSelectedProductTitles()?.map((title) => (
              <Text key={title} color="subdued" as="span">
                {title}
                <br />
              </Text>
            ))}
          </div>
          <Button
            plain
            fullWidth
            // Replace toggleModal with resource picker handler
            onClick={handleProductResourcePicker}
          >
            {upsellData.conditions.selectedProducts.length > 0
              ? "Edit Products"
              : "Select Parent Product"}
          </Button>
        </Card>
        <Card>
          <Text fontWeight="bold">Based on product collection in cart</Text>
          <div
            style={{ marginTop: "8px", marginBottom: "8px", minHeight: "40px" }}
          >
            {" "}
            {/* Added minHeight */}
            {getSelectedCollectionTitles()?.map((handle) => (
              <Text key={handle} color="subdued" as="span">
                {handle}
                <br />
              </Text>
            ))}
          </div>
          <Button
            plain
            fullWidth
            // Replace toggleModal with resource picker handler
            onClick={handleCollectionResourcePicker}
          >
            {upsellData.conditions.selectedCollections.length > 0
              ? "Edit Collections"
              : "Select Parent Collection"}
          </Button>
        </Card>
      </div>
      {/* Remove Modal rendering */}
      {/* {renderModal(
        "product",
        modalOpen,
        products,
        upsellData.conditions.selectedProducts,
        () => toggleModal("product", false),
      )}
      {renderModal(
        "collection",
        collectionModalOpen,
        collections,
        upsellData.conditions.selectedCollections,
        () => toggleModal("collection", false),
      )} */}
    </Card>
  );
}

// Step #3: Select Product For Upsell
export function SelectProductForUpsell({ products, shopId }) {
  const fetcher = useFetcher();
  const { upsellData, setUpsellData } = useContext(UpsellContext);
  const { upsellDetails } = useLoaderData();
  const isEditMode = !!upsellDetails;

  // Use Shopify resource picker for product selection
  const handleProductSelection = async (index) => {
    try {
      const result = await window.shopify.resourcePicker({
        type: "product",  
        action: "select",
        multiple: false,
        selectMultiple: false,
        filter: {
          hidden: false,
          variants: false,
          draft: false,
          archived: false,
        },
      });
      if (result && result.length > 0) {
        const selectedProduct = result[0];
        setUpsellData((prev) => ({
          ...prev,
          upsellProducts: prev.upsellProducts.map((id, i) =>
            i === index ? selectedProduct.id : id,
          ),
        }));
      }
    } catch (error) {
      console.error("Error selecting product:", error);
    }
  };

  const saveAllSettings = () => {
    fetcher.submit(
      {
        action: isEditMode ? "updateUpsellSettings" : "saveUpsellSettings",
        upsellId: isEditMode ? upsellDetails.id : undefined,
        upsellName: upsellData.upsellName,
        selectedProducts: JSON.stringify(
          upsellData.conditions.selectedProducts,
        ),
        selectedCollections: JSON.stringify(
          upsellData.conditions.selectedCollections,
        ),
        upsellProducts: JSON.stringify(upsellData.upsellProducts),
        selectionType: upsellData.conditions.selectionType,
        shopId: shopId,
      },
      { method: "POST", action: "/api/upsell/create" },
    );
  };

  const getProductTitle = (productId) => {
    return (
      products?.edges?.find((product) => product.node.id === productId)?.node
        .title || ""
    );
  };

  return (
    <>
      <Card>
        <Text as="h3" variant="headingMd">
          Step #3: Select Products to Offer at Checkout
        </Text>
        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          {["Product 1", "Product 2", "Product 3"].map((label, index) => (
            <Card key={index}>
              <div className="">
                <Text fontWeight="bold">{label}</Text>
                <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                  {upsellData.upsellProducts[index] && (
                    <Text color="subdued" as="span">
                      {getProductTitle(upsellData.upsellProducts[index])}
                      <br />
                    </Text>
                  )}
                </div>
                <Button fullWidth onClick={() => handleProductSelection(index)}>
                  {upsellData.upsellProducts[index]
                    ? `Selected`
                    : `Select Product ${index + 1}`}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: "20px" }}>
          <Button variant="primary" onClick={saveAllSettings}>
            {isEditMode ? "Update Settings" : "Save Settings"}
          </Button>
        </div>
        <br />
        {fetcher.state === "submitting" && (
          <Banner status="info">Saving all settings...</Banner>
        )}
        {fetcher.state === "idle" && fetcher.data?.success && (
          <Banner status="success">All settings saved successfully!</Banner>
        )}
        {fetcher.state === "idle" && fetcher.data?.error && (
          <Banner status="critical">Error: {fetcher.data.error}</Banner>
        )}
      </Card>
    </>
  );  
}
