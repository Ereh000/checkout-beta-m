-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellSettings" (
    "id" SERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "upsellName" TEXT NOT NULL,
    "selectedProducts" JSONB NOT NULL,
    "selectedCollections" JSONB NOT NULL,
    "upsellProducts" JSONB NOT NULL,
    "selectionType" TEXT NOT NULL DEFAULT 'specific',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_renames" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customizeName" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "newName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_renames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_customizations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Hide Shipping',
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shippingMethodToHide" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMessage" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Rename Shipping',
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shippingMethodToHide" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_hide" (
    "id" SERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "customizeName" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_hide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpsellSettings_upsellName_key" ON "UpsellSettings"("upsellName");

-- CreateIndex
CREATE INDEX "shipping_customizations_shop_idx" ON "shipping_customizations"("shop");

-- CreateIndex
CREATE INDEX "ShippingMessage_shop_idx" ON "ShippingMessage"("shop");

-- CreateIndex
CREATE INDEX "payment_hide_shopId_idx" ON "payment_hide"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_hide_shopId_customizeName_key" ON "payment_hide"("shopId", "customizeName");
