import {
  reactExtension,
  InlineStack,
  Image,
  View,
  useSettings,
  Link,
  BlockStack,
  Heading,
  Text,
} from "@shopify/ui-extensions-react/checkout";

reactExtension("purchase.checkout.block.render", () => <SocialMediaIcons />);

// --------------------- Thankyou Page Block Rendering -------------------------------
const thankYouRender = reactExtension("purchase.thank-you.block.render", () => (
  <SocialMediaIcons />
));
export { thankYouRender };

// --------------------- Orddr Status Page Block Rendering -------------------------------
const orderDetailsRender = reactExtension(
  "customer-account.order-status.block.render",
  () => <SocialMediaIcons />,
);
export { orderDetailsRender };

export default function SocialMediaIcons() {
  const {
    heading,
    subheading,
    icon1,
    icon2,
    icon3,
    icon4,
    icon5,
    icon1_url,
    icon2_url,
    icon3_url,
    icon4_url,
    icon5_url,
  } = useSettings();

  const icons = {
    facebook:
      "https://checkoutplus.s3.us-west-1.amazonaws.com/f_logo_RGB-Blue_100.png",
    instagram:
      "https://checkoutplus.s3.us-west-1.amazonaws.com/Instagram_Glyph_Gradient+copy.png",
    linkedin: "https://checkoutplus.s3.us-west-1.amazonaws.com/linked-in.png",
    pintrest: "https://checkoutplus.s3.us-west-1.amazonaws.com/pintrest.png",
    whatsapp: "https://checkoutplus.s3.us-west-1.amazonaws.com/whatsapp.png",
  };

  return (
    <BlockStack
      border="base"
      cornerRadius="base"
      inlineAlignment="left"
      blockAlignment="left"
      padding="base"
    >
      {heading ? (
        <Heading>{heading}</Heading>
      ) : (
        <Heading>Follow Us | Share Your Purchase! (Preview)</Heading>
      )}
      {subheading ? (
        <Text>{subheading}</Text>
      ) : (
        <Text>
          Add any message you would like for your customers to share on social
          media or to follow you. (Preview)
        </Text>  
      )}
      <InlineStack inlineAlignment="center" blockAlignment="center">
        {icon1 && (
          <Link to={icon1_url} external={true}>
            <View maxInlineSize="35px">
              <Image
                source={
                  icon1 == "facebook"
                    ? icons.facebook
                    : icon1 == "instagram"
                      ? icons.instagram
                      : icon1 == "linkedin"
                        ? icons.linkedin
                        : icon1 == "pintrest"
                          ? icons.pintrest
                          : icon1 == "whatsapp"
                            ? icons.whatsapp
                            : icon1 == "none"
                              ? ""
                              : ""
                }
              />
            </View>
          </Link>
        )}
        {icon2 && (
          <Link to={icon2_url} external={true}>
            <View maxInlineSize="35px">
              <Image
                source={
                  icon2 == "facebook"
                    ? icons.facebook
                    : icon2 == "instagram"
                      ? icons.instagram
                      : icon2 == "linkedin"
                        ? icons.linkedin
                        : icon2 == "pintrest"
                          ? icons.pintrest
                          : icon1 == "whatsapp"
                            ? icons.whatsapp
                            : icon1 == "none"
                              ? ""
                              : ""
                }
              />
            </View>
          </Link>
        )}
        {icon3 && (
          <Link to={icon3_url} external={true}>
            <View maxInlineSize="35px">
              <Image
                source={
                  icon3 == "facebook"
                    ? icons.facebook
                    : icon3 == "instagram"
                      ? icons.instagram
                      : icon3 == "linkedin"
                        ? icons.linkedin
                        : icon3 == "pintrest"
                          ? icons.pintrest
                          : icon1 == "whatsapp"
                            ? icons.whatsapp
                            : icon1 == "none"
                              ? ""
                              : ""
                }
              />
            </View>
          </Link>
        )}
        {icon4 && (
          <Link to={icon4_url} external={true}>
            <View maxInlineSize="35px">
              <Image
                source={
                  icon4 == "facebook"
                    ? icons.facebook
                    : icon4 == "instagram"
                      ? icons.instagram
                      : icon4 == "linkedin"
                        ? icons.linkedin
                        : icon4 == "pintrest"
                          ? icons.pintrest
                          : icon1 == "whatsapp"
                            ? icons.whatsapp
                            : icon1 == "none"
                              ? ""
                              : ""
                }
              />
            </View>
          </Link>
        )}
        {icon5 && (
          <Link to={icon5_url} external={true}>
            <View maxInlineSize="35px">
              <Image
                source={
                  icon5 == "facebook"
                    ? icons.facebook
                    : icon5 == "instagram"
                      ? icons.instagram
                      : icon5 == "linkedin"
                        ? icons.linkedin
                        : icon5 == "pintrest"
                          ? icons.pintrest
                          : icon1 == "whatsapp"
                            ? icons.whatsapp
                            : icon1 == "none"
                              ? ""
                              : ""
                }
              />
            </View>
          </Link>
        )}
      </InlineStack>
    </BlockStack>
  );
}
