# ShamFood Security Specification

## Data Invariants
- A User profile can only be created by the authenticated user with matching UID.
- Users can only read their own private profile data.
- Products can only be created/updated/deleted by Admin users.
- Orders must have a valid `userId` matching the authenticated user.
- Users can only read their own orders.
- Only Admins can update order statuses (Accepted, Preparing, etc.).
- Users can ONLY update their own order if it's currently 'pending' and they want to 'cancel' it (though we'll restrict cancellation for now to keep it simple).

## The Dirty Dozen (Test Matrix)
1.  **Identity Theft**: User A tries to read User B's profile. (Denied)
2.  **Impersonation**: User A tries to create an order as User B. (Denied)
3.  **Price Tampering**: User tries to create an order with a price lower than product price (Note: Rules can't check across collections easily without complex logic, but we'll enforce schema).
4.  **Admin Spoofing**: Regular user tries to update their role to 'admin' in Firestore. (Denied)
5.  **Illegal Status Jump**: User tries to mark their own order as 'delivered'. (Denied)
6.  **Menu Poisoning**: Non-admin tries to add a free item to the menu. (Denied)
7.  **Resource Exhaustion**: Attacker tries to create a product with a 1MB title. (Denied)
8.  **Orphaned Order**: Creating an order without a userId. (Denied)
9.  **Historical Revisionism**: User tries to change their `createdAt` date. (Denied)
10. **Shadow Field Injection**: User adds `isVerified: true` to a profile during update. (Denied)
11. **Path Poisoning**: User tries to use a 256-character string as a userId. (Denied)
12. **Blanket Read Inquiry**: User tries to list all users in the system. (Denied)
