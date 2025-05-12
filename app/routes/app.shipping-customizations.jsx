import React, { useEffect, useState } from "react";
import {
  Page,
  LegacyCard,
  MediaCard,
  VideoThumbnail,
  EmptyState,
  Button,
  Modal,
  Text,
  Icon,
  TextContainer,
  Badge,
  DataTable,
  Toast,
  Frame,
} from "@shopify/polaris";
import { ArrowRightIcon, DeleteIcon } from "@shopify/polaris-icons"; // Importing Close Icon
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import prisma from "../db.server"; // Import Prisma client
import { authenticate } from "../shopify.server"; // For authentication
import { json } from "@remix-run/node"; // For loader function

// --- Add Loader Function ---
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  // Fetch Shop GraphQL ID in the loader
  const shopIdResponse = await admin.graphql(
    `#graphql
      query shopInfo {
        shop {
          id
        }
      }`,
  );
  const shopIdData = await shopIdResponse.json();
  const shopGid = shopIdData.data?.shop?.id;

  // const shop = session.shop; // Get shop from session

  // Fetch both types of customizations concurrently
  const [hideCustomizations, messageCustomizations] = await Promise.all([
    prisma.shippingCustomization.findMany({
      where: { shop: shopGid }, // Filter by shop
      orderBy: { createdAt: "desc" }, // Optional: order by creation date
    }),
    prisma.shippingMessage.findMany({
      where: { shop: shopGid }, // Filter by shop
      orderBy: { createdAt: "desc" }, // Optional: order by creation date
    }),
  ]);

  // Combine data and add a 'type' identifier if not already present in the model
  // (Using the default value from the schema)
  const allCustomizations = [...hideCustomizations, ...messageCustomizations];

  return json({ customizations: allCustomizations }); // Return combined data
}
// --- End Loader Function ---

export const action = async ({ request }) => {
  if (request.method === "DELETE") {
    const formdata = await request.formData();
    const id = formdata.get("id");

    if (!id) {
      return json({ error: "ID is required" }, { status: 400 });
    }

    try {
      await prisma.shippingCustomization.delete({
        where: { id: id },
      });

      return json({ success: true });
    } catch (error) {
      console.error("Error deleting customization:", error);
      return json({ error: "Failed to delete customization" }, { status: 500 });
    }
  }
};

export default function PaymentCustomization() {
  const fetcher = useFetcher();
  // --- Use loader data ---
  const { customizations } = useLoaderData();
  // State to control modal visibility
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toastProps, setToastProps] = useState({
    active: false,
    message: "",
    error: false,
  });

  const handleDelete = async (item) => {
    try {
      const formData = new FormData();
      formData.append("id", item.id);

      fetcher.submit(formData, {
        method: "DELETE",
        action: ".",
      });
      setShowDeleteModal(false); // Close modal after deletion
    } catch (error) {
      console.error("Error deleting customization:", error);
      setToastProps({
        active: true,
        message: "Failed to delete customization",
        error: true,
      });
    }
  };

  React.useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.errors) {
        setToastProps({
          active: true,
          message: fetcher.data.error,
          error: true,
        });
      } else if (fetcher.data.success) {
        setToastProps({
          active: true,
          message: "Customization deleted successfully",
          error: false,
        });
      }
    }
  }, [fetcher.data]);

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sort customizations by date (most recent first)
  const sortedCustomizations = [...customizations].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  // Add loading state tracking
  const isDeleting = fetcher.state !== "idle";

  // --- Prepare data for DataTable ---
  const rows = sortedCustomizations.map((item) => [
    // console.log("item",item),
    item.name, // Customization Name
    item.type, // Type (e.g., "Hide Shipping", "Rename Shipping")
    <Badge key={`${item.id}-status`} tone="success">
      Active
    </Badge>,
    formatDate(item.createdAt), // Add formatted date
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Button
        key={`${item.id}-edit`}
        url={
          item.type === "Hide Shipping"
            ? `/app/hide-shipping-method?id=${item.id}`
            : `/app/shipping-add-message?id=${item.id}`
        }
      >
        Edit
      </Button>
      <Button
        variant="primary"
        loading={isDeleting && itemToDelete?.id === item.id}
        // disabled={isDeleting}
        onClick={() => {
          setItemToDelete(item);
          setShowDeleteModal(true);
        }}
        icon={DeleteIcon}
      ></Button>
    </div>,
  ]);
  // --- End Prepare data for DataTable ---

  return (
    <Frame>
      <Page
        backAction={{ content: "Settings", url: "/app" }}
        title="Shipping Customizations"
        primaryAction={
          <Button variant="primary" onClick={() => setIsOpen(true)}>
            Create Customization
          </Button>
        }
      >

        <br />
        {/* --- Conditional Rendering: DataTable or EmptyState --- */}
        {customizations.length > 0 ? (
          <LegacyCard>
            <DataTable
              columnContentTypes={[
                "text", // Name
                "text", // Type
                "text", // Status
                "text", // Date
                "text", // Edit
              ]}
              headings={["Name", "Type", "Status", "Created At", "Actions"]}
              rows={rows} // Use the prepared rows
            />
          </LegacyCard>
        ) : (
          <LegacyCard sectioned>
            <EmptyState
              heading="No customizations"
              image="https://cdn.shopify.com/shopifycloud/web/assets/v1/2b13a3a6f21ed6ba.svg"
            >
              <p>
                Create a new customization to start customizing your shipping
                methods at checkout.
              </p>
            </EmptyState>
          </LegacyCard>
        )}
        {/* --- End Conditional Rendering --- */}

        {/* Polaris Modal */}
        <div className="shipping_customization_model">
          <Modal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            title="Select A Customization"
          >
            {/* Option 1 */}
            <Modal.Section>
              <Link
                to={"/app/hide-shipping-method"}
                style={{ textDecoration: "none", color: "#000" }}
              >
                <TextContainer>
                  <div
                    className="flex justify-between items-center"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div className="">
                      <Text variant="headingMd" as="h5">
                        Hide Shipping Methodd
                      </Text>
                      <p>Hide shipping method based on order totals</p>
                    </div>
                    <div className="">
                      <Icon source={ArrowRightIcon}></Icon>
                    </div>
                  </div>
                </TextContainer>
              </Link>
            </Modal.Section>
            {/* Option 2 */}
            <Modal.Section>
              <Link
                to={"/app/shipping-add-message"}
                style={{ textDecoration: "none", color: "#000" }}
              >
                <TextContainer onClick={() => console.log("clicked")}>
                  <div
                    className="flex justify-between items-center"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div className="">
                      <Text variant="headingMd" as="h5">
                        Add Message to Shipping Method
                      </Text>
                      <p>Display a message below a shipping method</p>
                    </div>
                    <div className="">
                      <Icon source={ArrowRightIcon}></Icon>
                    </div>
                  </div>
                </TextContainer>
              </Link>
            </Modal.Section>

            {/* These Features will be indule later */}
            {/* <Modal.Section>
            <Link style={{ textDecoration: "none", color: "#000" }}>
              <TextContainer onClick={() => console.log("clicked")}>
                <div
                  className="flex justify-between items-center"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <div className="">
                    <Text variant="headingMd" as="h5">
                      Reorder Shipping Method
                    </Text>
                    <p>
                      Control the order in which your shipping methods are
                      displayed
                    </p>
                  </div>
                  <div className="">
                    <Icon source={ArrowRightIcon}></Icon>
                  </div>
                </div>
              </TextContainer>
            </Link>
          </Modal.Section>
          <Modal.Section>
            <Link style={{ textDecoration: "none", color: "#000" }}>
              <TextContainer onClick={() => console.log("clicked")}>
                <div
                  className="flex justify-between items-center"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <div className="">
                    <Text variant="headingMd" as="h5">
                      Don't see what you looking for
                    </Text>
                    <p>
                      Contact us and we will be happy to support your business
                    </p>
                  </div>
                  <div className="">
                    <Icon source={ArrowRightIcon}></Icon>
                  </div>
                </div>
              </TextContainer>
            </Link>
          </Modal.Section> */}
          </Modal>
        </div>

        {/* Add Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Customization"
        >
          <Modal.Section>
            <TextContainer>
              <p>Are you sure you want to delete this customization?</p>
              <p>This action cannot be undone.</p>
            </TextContainer>
          </Modal.Section>
          <Modal.Section>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <Button onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button
                tone="critical"
                variant="primary"
                onClick={() => {
                  handleDelete(itemToDelete);
                  setShowDeleteModal(false);
                }}
              >
                Delete
              </Button>
            </div>
          </Modal.Section>
        </Modal>

        {/* Add Toast component */}
        {toastProps.active && (
          <Toast
            content={toastProps.message}
            error={toastProps.error}
            onDismiss={() => setToastProps({ ...toastProps, active: false })}
            duration={4000}
          />
        )}

        <br />
        <br />
      </Page>
    </Frame>
  );
}
