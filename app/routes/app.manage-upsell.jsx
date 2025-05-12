import React, { useState } from "react";
import { json, useFetcher, useLoaderData } from "@remix-run/react";
import { authenticate, PLUS_PLAN, PLUS_PLAN_YEARLY } from "../shopify.server";
import prisma from "../db.server";
import {
  Page,
  LegacyCard,
  IndexTable,
  Text,
  Button,
  ButtonGroup,
  Toast,
  Modal,
  TextContainer,
  EmptyState,  
  MediaCard,
  VideoThumbnail,
  Banner,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";

// Add loader function
export async function loader({ request }) {
  try {
    const { admin, billing } = await authenticate.admin(request);

    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: [PLUS_PLAN, PLUS_PLAN_YEARLY],
      isTest: true,
    });

    const response = await admin.graphql(`
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
    const data = await response.json();
    const shopPlan = data.data?.shop?.plan;

    // Fetch all upsells for this shop
    const upsells = await prisma.upsellSettings.findMany({
      where: {
        shopId: data.data.shop.id,
      },
      select: {
        id: true,
        upsellName: true,
        selectionType: true,
        selectedProducts: true,
        selectedCollections: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("active payment:", hasActivePayment);
    console.log("app subscriptions:", appSubscriptions);

    return { upsells, shopPlan, hasActivePayment, appSubscriptions };
  } catch (error) {
    console.error("Loader error:", error);
    return { upsells: [] };
  }
}

// Add action function for delete
export async function action({ request }) {
  const formData = await request.formData();
  const id = formData.get("id");

  try {
    await prisma.upsellSettings.delete({
      where: {
        id: parseInt(id),
      },
    });
    return json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return json(
      { success: false, error: "Failed to delete upsell" },
      { status: 500 },
    );
  }
}

export default function ManageUpsell() {
  const { upsells, shopPlan, hasActivePayment, appSubscriptions } =
    useLoaderData();
  console.log("shopPlan:", shopPlan);
  const fetcher = useFetcher();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUpsell, setSelectedUpsell] = useState(null);

  const handleDeleteClick = (upsell) => {
    setSelectedUpsell(upsell);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedUpsell) {
      fetcher.submit(
        { action: "delete", id: selectedUpsell.id },
        { method: "POST" },
      );
      setDeleteModalOpen(false);
      setSelectedUpsell(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setSelectedUpsell(null);
  };

  const getConditionType = (upsell) => {
    console.log("upsell:", upsell);
    if (upsell.selectedProducts && upsell.selectedProducts.length > 0) {
      return "Selected Products";
    } else if (
      upsell.selectedCollections &&
      upsell.selectedCollections.length > 0
    ) {
      return "Selected Collections";
    } else {
      return "All Products";
    }
  };

  const rowMarkup = upsells.map((upsell, index) => (
    <IndexTable.Row id={upsell.id} key={upsell.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold">
          {upsell.upsellName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd">
          {/* {getConditionType(upsell)} */}
          {upsell.selectionType === "all"
            ? "All Products"
            : getConditionType(upsell)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(upsell.createdAt).toLocaleDateString()}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button plain url={`/app/create-upsell?id=${upsell.id}`}>
            Edit
          </Button>
          <Button
            variant="primary"
            // tone="critical"
            icon={DeleteIcon}
            onClick={() => handleDeleteClick(upsell)}
          >
            {/* Delete */}
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Manage Upsells"
      primaryAction={
        <Button
          variant="primary"
          url="/app/create-upsell"
          disabled={
            !hasActivePayment
              ? true
              : shopPlan.displayName === "Developer Preview" ||
                  shopPlan.shopifyPlus === true
                ? false
                : true
          }
        >
          Create Upsell
        </Button>
      }
    >
      {/* Checking shopify plus or dev. preview */}
      {shopPlan.displayName === "Developer Preview" ||
        (shopPlan.shopifyPlus === true && (
          <>
            <Banner title="Checkout can't be Customized" tone="warning">
              <p>
                You store type is not Shopify Plus or Developer's Preview. You
                can't customize checkout page.
              </p>
            </Banner>
            <br />
          </>
        ))}
      {!hasActivePayment && (
        <>
          <Banner
            title="Upgrade your plan"
            tone="warning"
            action={{ content: "Upgrade", url: "/app/subscription-manage" }}
          >
            <p>You are on a free plan. Upgrade your plan to create upsells.</p>
          </Banner>
          <br />
        </>
      )}

      <LegacyCard>
        <IndexTable
          resourceName={{ singular: "Upsell", plural: "Upsells" }}
          itemCount={upsells.length}
          headings={[
            { title: "Upsell Name" },
            { title: "Condition Type" },
            { title: "Created Date" },
            { title: "Actions" },
          ]}
          selectable={false}
        >
          {rowMarkup}
        </IndexTable>
      </LegacyCard>

      {upsells.length === 0 && (  
        <LegacyCard sectioned>
          <EmptyState
            heading="No upsells created yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Create your first upsell to start boosting your sales.</p>
          </EmptyState>
        </LegacyCard>
      )}

      <Modal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete Upsell"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDeleteCancel,
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Are you sure you want to delete the upsell "
              {selectedUpsell?.upsellName}"? This action cannot be undone.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
