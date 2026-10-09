/**
 * Placeholder notification service for new orders.
 * In production, this can send SMS, WhatsApp or email notifications.
 * Failures here must never fail the order creation transaction.
 *
 * @param {Object} order The newly created order object
 */
export async function notifyNewOrder(order) {
  // Empty placeholder for now
  // For debugging, we can log with masked phone:
  // console.log(`[NOTIFY] New order received: ${order.reference}`);
}
