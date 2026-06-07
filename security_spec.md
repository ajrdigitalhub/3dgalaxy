# Security Specification - eCommerce Admin System

## Data Invariants
- **Identity Integrity**: Users can only modify their own profiles.
- **Admin Supremacy**: Staff with `admin` or `super-admin` roles have elevated privileges across all collections.
- **Order Sanctity**: Once an order is placed, a customer cannot modify its status or items (only admins can).
- **Public Disclosure**: Categories, Products, Reviews, BlogPosts, Banners, and basic Store Settings are publicly readable.
- **Sensitive Data**: Payment details and full order history are strictly restricted to the owner/admin.

## The Dirty Dozen Payloads
1. **Unauthenticated Write**: Attempting to create a product without being logged in.
2. **Identity Spoofing**: User A trying to update User B's profile.
3. **Privilege Escalation**: User A trying to set their own `role` to 'admin'.
4. **Illegal Review**: User A posting a review as User B.
5. **Ghost Field Injection**: Adding a `hiddenFlag` to a product update.
6. **Status Shortcut**: A customer trying to mark their own order as 'shipped'.
7. **Negative Stock**: Trying to set product stock to -1.
8. **Resource Poisoning**: Injection of a huge 1MB string into category name.
9. **Orphaned Order**: Creating an order for a product ID that doesn't exist.
10. **Discount Hack**: Applying a 100% discount by modifying the `grandTotal` directly on order creation.
11. **Self-Assigned Rewards**: Updating own `rewardPoints` without a purchase.
12. **Unauthorized Settings Change**: A guest trying to change the site's primary color.

## Test Runner (Draft)
I will implement `firestore.rules.test.ts` to verify these.
