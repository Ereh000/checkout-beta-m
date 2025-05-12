import React, { useState } from "react";
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
  Card,
  DataTable, // Import DataTable
  Badge,
  TextContainer,
  ButtonGroup,
  Toast,
  Frame, // Import Badge
} from "@shopify/polaris";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleUpIcon,
  DeleteIcon,
} from "@shopify/polaris-icons"; // Importing Close Icon
import { Link, useLoaderData, json, useFetcher } from "@remix-run/react"; // Import useLoaderData and json
import prisma from "../db.server"; // Import Prisma client
import { authenticate } from "../shopify.server"; // Import authenticate

// --- Add Loader Function ---
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  // Fetch Shop GraphQL ID
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

  if (!shopGid) {
    console.error("Shop ID not found in loader GraphQL response:", shopIdData);
    throw new Response("Could not retrieve shop identifier.", { status: 500 });
  }

  // Fetch both types of payment customizations concurrently
  const [hideCustomizations, renameCustomizations] = await Promise.all([
    prisma.paymentHide.findMany({
      where: { shopId: shopGid }, // Filter by shop GID
      select: {
        id: true,
        customizeName: true, // Use customizeName as the common name field
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentRename.findMany({
      where: { shopId: shopGid }, // Filter by shop GID
      select: {
        id: true,
        customizeName: true, // Use customizeName as the common name field
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Add other prisma queries here if needed (e.g., for reorder)
  ]);

  // Combine data and add a 'type' identifier
  const allCustomizations = [
    ...hideCustomizations.map((item) => ({ ...item, type: "Hide Payment" })),
    ...renameCustomizations.map((item) => ({
      ...item,
      type: "Rename Payment",
    })),
    // Add other customization types here
  ];

  // Sort combined list by creation date if needed (already sorted by Prisma)
  // allCustomizations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return json({ customizations: allCustomizations }); // Return combined data
}
// --- End Loader Function ---

// Add action handler for delete
export async function action({ request }) {
  if (request.method === "DELETE") {
    const formData = await request.formData();
    const id = formData.get("id");
    const type = formData.get("type");

    try {
      if (type === "Hide Payment") {
        await prisma.paymentHide.delete({
          where: { id: parseInt(id) },
        });
      } else if (type === "Rename Payment") {
        await prisma.paymentRename.delete({
          where: { id: parseInt(id) },
        });
      }

      console.log("Customization deleted successfully");
      return json({ success: true });
    } catch (error) {
      console.error("Error deleting customization:", error);
      return json({ error: "Failed to delete customization" }, { status: 500 });
    }
  }
}
// --- End action handler ---

export default function PaymentCustomization() {
  // State to control modal visibility
  const [isOpen, setIsOpen] = useState(false);
  // --- Use loader data ---
  const { customizations } = useLoaderData();
  const fetcher = useFetcher();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toastProps, setToastProps] = useState({
    active: false,
    message: "",
    error: false,
  });

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle delete
  const handleDelete = async (item) => {
    try {
      const formData = new FormData();
      formData.append("id", item.id);
      formData.append("type", item.type);

      fetcher.submit(formData, {
        method: "DELETE",
        action: ".",
      });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting customization:", error);
      setToastProps({
        active: true,
        message: "Failed to delete customization",
        error: true,
      });
    }
  };

  // Add loading state tracking
  const isDeleting = fetcher.state !== "idle";

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

  // Prepare data for DataTable
  const rows = customizations.map((item) => [
    item.customizeName,
    item.type,
    <Badge
      key={`${item.id}-status`}
      tone={item.status === "active" ? "success" : "critical"}
    >
      {item.status === "active" ? "Active" : "Inactive"}
    </Badge>,
    formatDate(item.createdAt), // Add date column
    <div key={`${item.id}-actions`} style={{ display: "flex", gap: "0.5rem" }}>
      <Button
        url={
          item.type === "Hide Payment"
            ? `/app/hide-payment?id=${item.id}`
            : `/app/rename-payment?id=${item.id}`
        }
      >
        Edit
      </Button>
      <Button
        variant="primary"
        loading={isDeleting && itemToDelete?.id === item.id}
        // tone="critical"
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
        title="Payment Customizations"
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
                "text", // Status (using Badge component)
                "text", // Add date column type
                "text", // Action
              ]}
              headings={["Name", "Type", "Status", "Created Date", "Actions"]}
              rows={rows} // Use the prepared rows
            />
          </LegacyCard>
        ) : (
          <LegacyCard sectioned>
            <EmptyState
              heading="No payment customizations yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Create a new customization to modify payment options at
                checkout.
              </p>
            </EmptyState>
          </LegacyCard>
        )}
        {/* --- End Conditional Rendering --- */}

        {/* Polaris Modal */}
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Select A Customization"
        >
          <Modal.Section>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {/* Option 1: Hide Payment Method */}
              <Link
                to={"/app/hide-payment"}
                style={{
                  textDecoration: "none",
                  color: "#000",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    Hide Payment Method
                  </Text>
                  <Text as="span" variant="bodySm" color="subdued">
                    Hide payment method based on Order totals
                  </Text>
                </div>
                <div className="" style={{ width: "1.4rem", display: "flex" }}>
                  <ArrowRightIcon />
                </div>
              </Link>

              {/* Option 2: Change Payment Method Name */}
              <Link
                to={"/app/rename-payment"}
                style={{
                  textDecoration: "none",
                  color: "#000",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    Change Name of Payment Method
                  </Text>
                  <Text as="span" variant="bodySm" color="subdued">
                    Update the name of a specific payment method
                  </Text>
                </div>
                <div className="" style={{ width: "1.4rem", display: "flex" }}>
                  <ArrowRightIcon />
                </div>
              </Link>

              {/* These Features will be indule later */}
              {/* <Link
              style={{
                textDecoration: "none",
                color: "#000",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <Text as="span" variant="bodyMd" fontWeight="bold">
                  Reorder Payment Method
                </Text>
                <Text as="span" variant="bodySm" color="subdued">
                  Reorder the payment methods to suit your preferences
                </Text>
              </div>
              <div className="" style={{ width: "1.4rem", display: "flex" }}>
                <ArrowRightIcon />
              </div>
            </Link>
            <Link
              style={{
                textDecoration: "none",
                color: "#000",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <Text as="span" variant="bodyMd" fontWeight="bold">
                  Don't see what you looking for
                </Text>
                <Text as="span" variant="bodySm" color="subdued">
                  Submit a feature request and we will he happy to support you business need
                </Text>
              </div>
              <div className="" style={{ width: "1.4rem", display: "flex" }}>
                <ArrowRightIcon />
              </div>
            </Link> */}
              {/*  */}
            </div>
          </Modal.Section>
        </Modal>

        {/* Add Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Customization"
        >
          <Modal.Section>
            <TextContainer>
              <p>
                Are you sure you want to delete the customization "
                {itemToDelete?.customizeName}"? This action cannot be undone.
              </p>
            </TextContainer>
          </Modal.Section>
          <Modal.Section>
            <ButtonGroup>
              <Button onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                tone="critical"
                onClick={() => handleDelete(itemToDelete)}
              >
                Delete
              </Button>
            </ButtonGroup>
          </Modal.Section>
        </Modal>

        {/* Add Toast component */}
        {toastProps.active && (
          <Toast
            content={toastProps.message}
            error={toastProps.error}
            onDismiss={() => setToastProps({ ...toastProps, active: false })}
            duration={6000}
          />
        )}

        <br />
        <br />
      </Page>
    </Frame>
  );
}
