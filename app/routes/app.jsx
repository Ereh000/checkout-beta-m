import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

import "./assets/main.css";
import "./assets/output.css";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/payment-customization">Payment Customizations</Link>
        <Link to="/app/shipping-customizations">Shipping Customizations</Link>
        <Link to="/app/manage-upsell">Upsells</Link>
        <Link to="/app/customization">Customizations (Free)</Link>
        <Link to="/app/subscription-manage">Manage Subscription</Link>
        {/* <Link to="/app/additional">Additional</Link> */}
        {/* <Link to="/app/shipping-method-hide">Beta(Hide/Edit Shipping Method)</Link>
        <Link to="/app/beta/customization">Beta(Customization)</Link> */}
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
