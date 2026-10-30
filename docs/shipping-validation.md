# Shipping destination contract

JD-020 SDK companion: every `ShippingChoice` now carries `destination_postal_code`, matching the destination used to fetch its displayed rate. Custom SDK integrations constructing this type must supply that field.

The checkout step invalidates selection immediately when the destination, tenant, cart items or API base changes. It ignores late responses, blocks continuation until a matching successful response, and replaces the selected service with its refreshed object/price rather than retaining an old price.

This is client compatibility and stale-display protection, **not financial authorization**. The protocol server must independently query carrier rates for the tenant, authoritative cart items, destination and selected service, reject manipulated prices, and bind the later shipping address to the same destination. That server change and the private vendored SDK companion are separate linked JD-020 scopes. Do not mark JD-020 complete from this SDK change alone.

Compatibility: the added request field is additive for current servers; authoritative enforcement must be rolled out only after compatible clients (including the private vendored copy) are available. There is no client-managed free-shipping exception.

Validation uses `vitest.shipping-security.config.ts` with dotenv loading disabled, synthetic context/API responses and fake timers. No real carriers, payment systems or browser login flows are contacted.
