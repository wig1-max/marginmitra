import {
  BusinessVertical,
  CalculatedOrderProfit,
  CashflowSummary,
  DiscrepancySignal,
  MarketplacePlatform,
  ProfitPreviewResponse,
  ShippingZone,
  StandardizedOrderInput
} from './domain';

const SHIPPING_RATE_CARD: Record<
  ShippingZone,
  { basePaise: number; incrementalPaisePer500g: number }
> = {
  LOCAL: { basePaise: 3500, incrementalPaisePer500g: 800 },
  REGIONAL: { basePaise: 5000, incrementalPaisePer500g: 1200 },
  NATIONAL: { basePaise: 6500, incrementalPaisePer500g: 1600 }
};

const FOOD_DELIVERY_PLATFORMS: MarketplacePlatform[] = ['SWIGGY', 'ZOMATO'];

function roundDivide(value: number, divisor: number): number {
  return Math.round(value / divisor);
}

function bpsToPaise(basePaise: number, rateBps: number): number {
  return roundDivide(basePaise * rateBps, 10_000);
}

function detectBusinessVertical(
  order: StandardizedOrderInput
): BusinessVertical {
  if (FOOD_DELIVERY_PLATFORMS.includes(order.platform)) {
    return 'FOOD_DELIVERY';
  }

  return order.businessVertical;
}

export function estimateShippingFeePaise(
  packageWeightGrams: number,
  shippingZone: ShippingZone,
  direction: 'FORWARD' | 'REVERSE'
): number {
  const slabCount = Math.max(1, Math.ceil(packageWeightGrams / 500));
  const rate = SHIPPING_RATE_CARD[shippingZone];
  const raw =
    rate.basePaise + Math.max(0, slabCount - 1) * rate.incrementalPaisePer500g;

  return direction === 'REVERSE' ? Math.round(raw * 1.15) : raw;
}

interface ReconciliationStrategy {
  supports(order: StandardizedOrderInput): boolean;
  calculate(order: StandardizedOrderInput): CalculatedOrderProfit;
}

class EcommerceReconciliationStrategy implements ReconciliationStrategy {
  supports(order: StandardizedOrderInput): boolean {
    return detectBusinessVertical(order) === 'ECOMMERCE';
  }

  calculate(order: StandardizedOrderInput): CalculatedOrderProfit {
    const recognizedRevenuePaise =
      order.status === 'DELIVERED'
        ? Math.max(0, order.grossSalesPaise - order.sellerDiscountPaise)
        : 0;

    const commissionBasePaise = Math.max(
      0,
      order.grossSalesPaise - order.sellerDiscountPaise
    );
    const commissionPaise =
      order.commissionPaise ?? bpsToPaise(commissionBasePaise, order.commissionRateBps);

    const estimatedForwardShippingPaise = estimateShippingFeePaise(
      order.packageWeightGrams,
      order.shippingZone,
      'FORWARD'
    );
    const actualForwardShippingPaise =
      order.forwardShippingFeePaise ?? estimatedForwardShippingPaise;

    const reverseShippingPaise =
      order.status === 'RTO' || order.status === 'RETURNED'
        ? order.reverseShippingFeePaise ??
          estimateShippingFeePaise(
            order.packageWeightGrams,
            order.shippingZone,
            'REVERSE'
          )
        : 0;

    const expectedRtoReservePaise =
      order.status === 'IN_TRANSIT' || order.status === 'DELIVERED'
        ? bpsToPaise(order.grossSalesPaise, order.expectedRtoRateBps)
        : 0;

    const taxableFeeBasePaise =
      commissionPaise +
      actualForwardShippingPaise +
      reverseShippingPaise +
      order.paymentGatewayFeePaise +
      order.fixedPlatformFeePaise;

    const gstPaise =
      order.gstOnServicesPaise ?? bpsToPaise(taxableFeeBasePaise, order.gstRateBps);

    const taxCollectedAtSourcePaise = order.taxCollectedAtSourcePaise ?? 0;
    const taxDeductedAtSourcePaise = order.taxDeductedAtSourcePaise ?? 0;
    const otherAdjustmentsPaise = order.otherAdjustmentsPaise ?? 0;
    const cancellationPenaltyPaise = order.cancellationPenaltyPaise ?? 0;

    const totalDeductionsPaise =
      commissionPaise +
      actualForwardShippingPaise +
      reverseShippingPaise +
      order.paymentGatewayFeePaise +
      order.fixedPlatformFeePaise +
      expectedRtoReservePaise +
      cancellationPenaltyPaise +
      gstPaise +
      order.adSpendPaise +
      taxCollectedAtSourcePaise +
      taxDeductedAtSourcePaise +
      otherAdjustmentsPaise;

    const expectedNetPayoutPaise =
      recognizedRevenuePaise -
      (commissionPaise +
        actualForwardShippingPaise +
        reverseShippingPaise +
        order.paymentGatewayFeePaise +
        order.fixedPlatformFeePaise +
        cancellationPenaltyPaise +
        gstPaise +
        taxCollectedAtSourcePaise +
        taxDeductedAtSourcePaise +
        otherAdjustmentsPaise);

    const trueProfitPaise = recognizedRevenuePaise - totalDeductionsPaise;
    const discrepancySignals = buildCommonDiscrepancySignals(
      order,
      expectedNetPayoutPaise,
      actualForwardShippingPaise,
      estimatedForwardShippingPaise,
      commissionPaise
    );

    return {
      orderId: order.orderId,
      platform: order.platform,
      businessVertical: 'ECOMMERCE',
      status: order.status,
      orderDateIso: order.orderDateIso,
      grossSalesPaise: order.grossSalesPaise,
      recognizedRevenuePaise,
      expectedNetPayoutPaise,
      trueProfitPaise,
      deductions: {
        commissionPaise,
        forwardShippingPaise: actualForwardShippingPaise,
        reverseShippingPaise,
        paymentGatewayFeePaise: order.paymentGatewayFeePaise,
        platformFixedFeePaise: order.fixedPlatformFeePaise,
        expectedRtoReservePaise,
        cancellationPenaltyPaise,
        gstPaise,
        adSpendPaise: order.adSpendPaise,
        taxCollectedAtSourcePaise,
        taxDeductedAtSourcePaise,
        otherAdjustmentsPaise,
        sellerDiscountPaise: order.sellerDiscountPaise,
        totalDeductionsPaise
      },
      discrepancySignals
    };
  }
}

export class FoodDeliveryReconciliationStrategy
  implements ReconciliationStrategy
{
  supports(order: StandardizedOrderInput): boolean {
    return detectBusinessVertical(order) === 'FOOD_DELIVERY';
  }

  calculate(order: StandardizedOrderInput): CalculatedOrderProfit {
    const recognizedRevenuePaise =
      order.status === 'CANCELLED'
        ? 0
        : Math.max(0, order.grossSalesPaise - order.sellerDiscountPaise);

    // Food-delivery platforms usually charge a percentage commission on GMV or
    // the post-discount basket value. We allow either an explicit fee amount
    // from the settlement CSV or compute it from a configured bps rate.
    const commissionBasePaise = Math.max(
      0,
      order.grossSalesPaise - order.sellerDiscountPaise
    );
    const commissionPaise =
      order.commissionPaise ?? bpsToPaise(commissionBasePaise, order.commissionRateBps);

    // PG fees, ad spends, cancellation penalties, TCS/TDS, and GST on platform
    // services all leak directly out of the weekly payout and need to be
    // counted in the same order-level profitability view.
    const paymentGatewayFeePaise =
      order.paymentGatewayFeePaise > 0
        ? order.paymentGatewayFeePaise
        : bpsToPaise(order.grossSalesPaise, 180);
    const cancellationPenaltyPaise = order.cancellationPenaltyPaise ?? 0;
    const taxCollectedAtSourcePaise = order.taxCollectedAtSourcePaise ?? 0;
    const taxDeductedAtSourcePaise = order.taxDeductedAtSourcePaise ?? 0;
    const otherAdjustmentsPaise = order.otherAdjustmentsPaise ?? 0;

    const serviceFeeBasePaise =
      commissionPaise +
      paymentGatewayFeePaise +
      order.fixedPlatformFeePaise +
      cancellationPenaltyPaise;
    const gstPaise =
      order.gstOnServicesPaise ?? bpsToPaise(serviceFeeBasePaise, order.gstRateBps);

    const totalDeductionsPaise =
      commissionPaise +
      paymentGatewayFeePaise +
      order.fixedPlatformFeePaise +
      order.adSpendPaise +
      cancellationPenaltyPaise +
      gstPaise +
      taxCollectedAtSourcePaise +
      taxDeductedAtSourcePaise +
      otherAdjustmentsPaise;

    const expectedNetPayoutPaise = recognizedRevenuePaise - totalDeductionsPaise;
    const trueProfitPaise = expectedNetPayoutPaise;

    const discrepancySignals = buildCommonDiscrepancySignals(
      order,
      expectedNetPayoutPaise,
      0,
      0,
      commissionPaise
    );

    if (commissionBasePaise > 0 && commissionPaise > bpsToPaise(commissionBasePaise, 3000)) {
      discrepancySignals.push({
        type: 'HIGH_PLATFORM_COMMISSION',
        amountPaise: commissionPaise - bpsToPaise(commissionBasePaise, 3000),
        message: 'Platform commission is above the expected food-delivery range.',
        confidence: 0.63
      });
    }

    return {
      orderId: order.orderId,
      platform: order.platform,
      businessVertical: 'FOOD_DELIVERY',
      status: order.status,
      orderDateIso: order.orderDateIso,
      grossSalesPaise: order.grossSalesPaise,
      recognizedRevenuePaise,
      expectedNetPayoutPaise,
      trueProfitPaise,
      deductions: {
        commissionPaise,
        forwardShippingPaise: 0,
        reverseShippingPaise: 0,
        paymentGatewayFeePaise,
        platformFixedFeePaise: order.fixedPlatformFeePaise,
        expectedRtoReservePaise: 0,
        cancellationPenaltyPaise,
        gstPaise,
        adSpendPaise: order.adSpendPaise,
        taxCollectedAtSourcePaise,
        taxDeductedAtSourcePaise,
        otherAdjustmentsPaise,
        sellerDiscountPaise: order.sellerDiscountPaise,
        totalDeductionsPaise
      },
      discrepancySignals
    };
  }
}

function buildCommonDiscrepancySignals(
  order: StandardizedOrderInput,
  expectedNetPayoutPaise: number,
  actualForwardShippingPaise: number,
  estimatedForwardShippingPaise: number,
  commissionPaise: number
): DiscrepancySignal[] {
  const discrepancySignals: DiscrepancySignal[] = [];

  if (
    typeof order.actualPayoutPaise === 'number' &&
    order.actualPayoutPaise < expectedNetPayoutPaise - 1500
  ) {
    discrepancySignals.push({
      type: 'MISSING_PAYOUT',
      amountPaise: expectedNetPayoutPaise - order.actualPayoutPaise,
      message: 'Expected payout is lower than the computed receivable.',
      confidence: 0.89
    });
  }

  if (
    detectBusinessVertical(order) === 'ECOMMERCE' &&
    actualForwardShippingPaise > estimatedForwardShippingPaise + 1200
  ) {
    discrepancySignals.push({
      type: 'OVERCHARGED_SHIPPING',
      amountPaise: actualForwardShippingPaise - estimatedForwardShippingPaise,
      message: 'Shipping charged is above the configured slab estimate.',
      confidence: 0.74
    });
  }

  if (commissionPaise === 0 && order.grossSalesPaise > 0) {
    discrepancySignals.push({
      type: 'UNMAPPED_DEDUCTION',
      amountPaise: 0,
      message: 'Commission is zero. Review whether the settlement row was mapped correctly.',
      confidence: 0.48
    });
  }

  return discrepancySignals;
}

const strategies: ReconciliationStrategy[] = [
  new FoodDeliveryReconciliationStrategy(),
  new EcommerceReconciliationStrategy()
];

export function calculateOrderProfit(
  order: StandardizedOrderInput
): CalculatedOrderProfit {
  const strategy = strategies.find((candidate) => candidate.supports(order));

  if (!strategy) {
    throw new Error(`No reconciliation strategy found for platform ${order.platform}`);
  }

  return strategy.calculate(order);
}

export function buildCashflowSummary(
  orders: CalculatedOrderProfit[]
): CashflowSummary {
  return orders.reduce<CashflowSummary>(
    (summary, order) => {
      summary.orderCount += 1;
      summary.profitableOrderCount += order.trueProfitPaise > 0 ? 1 : 0;
      summary.grossSalesPaise += order.grossSalesPaise;
      summary.recognizedRevenuePaise += order.recognizedRevenuePaise;
      summary.totalDeductionsPaise += order.deductions.totalDeductionsPaise;
      summary.trueProfitPaise += order.trueProfitPaise;
      summary.claimsRecoverablePaise += order.discrepancySignals.reduce(
        (total, signal) => total + signal.amountPaise,
        0
      );
      summary.atRiskPaise += order.deductions.expectedRtoReservePaise;
      return summary;
    },
    {
      orderCount: 0,
      profitableOrderCount: 0,
      grossSalesPaise: 0,
      recognizedRevenuePaise: 0,
      totalDeductionsPaise: 0,
      trueProfitPaise: 0,
      claimsRecoverablePaise: 0,
      atRiskPaise: 0
    }
  );
}

export function previewTrueProfit(
  inputOrders: StandardizedOrderInput[]
): ProfitPreviewResponse {
  const orders = inputOrders.map(calculateOrderProfit);
  const summary = buildCashflowSummary(orders);

  return {
    generatedAtIso: new Date().toISOString(),
    currency: 'INR',
    summary,
    orders
  };
}
