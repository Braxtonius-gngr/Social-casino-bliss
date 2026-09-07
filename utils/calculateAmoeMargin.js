/**
 * @typedef {Object} AmoeParams
 * @property {number} stampCost - Cost of a single postage stamp.
 * @property {number} envelopeCost - Cost of a single envelope.
 * @property {number} cardCost - Cost of a single index card/paper.
 * @property {number} scPerCard - Number of Sweeps Coins (SC) awarded per valid entry.
 * @property {number} rejectionRatePct - Estimated percentage of rejected entries (0-100).
 */

/**
 * @typedef {Object} AmoeMetrics
 * @property {number} totalCostPerCard - Sum of all physical costs per card.
 * @property {number} netScYieldPerCard - Average SC gained per card after rejections.
 * @property {number} effectiveCostPerSc - Dollar cost to acquire 1 SC.
 * @property {number} roiPercentage - Return on investment percentage (assuming 1 SC = 1 USD).
 * @property {number} breakEvenRtpPct - Required game RTP percentage to break even.
 */

/**
 * Calculates profit margins and key metrics for AMOE writing.
 *
 * @param {AmoeParams} params - The costs and yields configuration.
 * @returns {AmoeMetrics} The calculated AMOE metrics.
 */
export function calculateAmoeMargin({ stampCost, envelopeCost, cardCost, scPerCard, rejectionRatePct }) {
  const totalCostPerCard = stampCost + envelopeCost + cardCost;

  // Constrain rejection rate between 0 and 100, convert to decimal
  const rejectionRate = Math.max(0, Math.min(100, rejectionRatePct)) / 100;
  const netScYieldPerCard = scPerCard * (1 - rejectionRate);

  // Prevent division by zero if yield is completely wiped out by rejections
  const effectiveCostPerSc = netScYieldPerCard > 0
    ? totalCostPerCard / netScYieldPerCard
    : Infinity;

  // Assuming 1 SC maps to 1 unit of fiat currency (e.g., $1.00)
  const netProfit = netScYieldPerCard - totalCostPerCard;
  const roiPercentage = totalCostPerCard > 0
    ? (netProfit / totalCostPerCard) * 100
    : 0;

  // The RTP % required to not lose money playing through the acquired SC
  const breakEvenRtpPct = netScYieldPerCard > 0
    ? (totalCostPerCard / netScYieldPerCard) * 100
    : Infinity;

  return {
    totalCostPerCard,
    netScYieldPerCard,
    effectiveCostPerSc,
    roiPercentage,
    breakEvenRtpPct
  };
}
