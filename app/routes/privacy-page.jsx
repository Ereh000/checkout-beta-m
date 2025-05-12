import React from "react";

export default function PrivacyPage() {
  return (
    <div
      className="privacy-policy-container"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        lineHeight: "1.5",
        padding: "20px",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
        Privacy Policy
      </h1>

      <p>
        Elevon Checkout Maximizer ("the App") helps merchants enhance their checkout experience
        with customizable blocks, smart rules, and upsell features. This Privacy Policy
        explains how personal information is collected, used, and shared when you
        install or use the App in connection with your store.
      </p>

      <h2>Personal Information the App Collects</h2>

      <p>
        When you install the App, we are automatically able to access certain
        types of information from your store account:
      </p>

      <ul>
        <li>Store details (name, domain, owner email)</li>
        <li>Product and variant information (titles, SKUs, options)</li>
        <li>Theme details (for app block placement)</li>
      </ul>

      <p>
        We may also collect the following information through interactions with the App:
      </p>

      <ul>
        <li>Store staff name and email using the app</li>
        <li>Customer browsing info (IP address, device type, browser)</li>
      </ul>

      <p>
        Information may also be collected via:
      </p>

      <ul>
        <li>Cookies – to personalize your experience</li>
        <li>Log files – track usage and performance</li>
        <li>Pixels/beacons – monitor engagement and feature usage</li>
      </ul>

      <h2>How Do We Use Your Personal Information?</h2>

      <p>We use this data to:</p>

      <ul>
        <li>Deliver, maintain, and improve the App</li>
        <li>Provide technical and customer support</li>
        <li>Send notifications about feature updates or important changes</li>
      </ul>

      <p>
        We do not use personal data for advertising or resale.
      </p>

      <h2>Sharing Your Personal Information</h2>

      <p>
        We do not sell your personal information. We may share it with trusted third-party
        services (e.g., hosting, analytics) strictly to operate and support the App.
      </p>

      <p>
        We may also share data when required by law or to respond to legal requests.
      </p>

      <h2>Your Rights</h2>

      <p>
        If you're located in certain jurisdictions, including the EU, you have the right to
        access, update, or request deletion of your personal data by contacting us below.
      </p>

      <p>
        Your data may be processed or stored in countries outside your jurisdiction.
      </p>

      <h2>Data Retention</h2>

      <p>
        We retain data only as long as necessary to deliver the App and fulfill legal requirements.
        You can request deletion by contacting us.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this Privacy Policy periodically. Changes will be posted on this page.
      </p>

      <h2>Contact Us</h2>
      <p>For any questions, requests, or concerns, contact us:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:support@elevonapps.com">support@elevonapps.com</a></li>
        <li><strong>Address:</strong> ElevonApps, India</li>
      </ul>
    </div>
  );
}
