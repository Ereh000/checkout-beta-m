import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }) {
  // const { session } = await authenticate.public.appProxy(request);

  // if (session) {
  try {
    // Parse product IDs from the request query
    const url = new URL(request.url);
    console.log("url", url);
    const productIds = url.searchParams.get("productIds")?.split(",") || [];

    if (productIds.length === 0) {
      return json({ upsellProducts: [] });
    }

    // Fetch upsell products based on the provided product IDs
    const upsellProducts = await prisma.upsellSettings.findMany();
    // const upsellProducts = await prisma.upsellSettings.findMany({
    //   where: {
    //     selectedProducts: { in: productIds },
    //   },
    // });

    return json({ upsellProducts });
  } catch (error) {
    console.error("Error fetching upsell data:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
  // }
  // return json({ error: "Unauthorized" }, { status: 401 });
}
