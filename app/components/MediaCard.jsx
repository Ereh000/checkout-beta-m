import React from "react";
import { MediaCard, VideoThumbnail } from "@shopify/polaris";

function MediaCard() {
  return (
    <div>
      {/* Existing content */}
      <MediaCard
        title="How to use Customizations"
        primaryAction={{
          content: "Learn more ",
          onAction: () => {},
        }}
        description="Thank you for using Checkout Plus. Here is an example of using shipping customizations on the checkout."
        popoverActions={[{ content: "Dismiss", onAction: () => {} }]}
      >
        <VideoThumbnail
          videoLength={80}
          thumbnailUrl="https://94m.app/images/Shipping-Customizations-Thumbnail.webp"
          onClick={() => console.log("clicked")}
        />
      </MediaCard>
    </div>
  );
}

export default MediaCard;
