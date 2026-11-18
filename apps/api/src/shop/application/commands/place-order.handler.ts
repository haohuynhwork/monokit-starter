import { Inject } from "@nestjs/common";
import {
  CommandHandler,
  EventBus,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { GetConfigQuery } from "../../../configs/application/queries/get-config.query.js";
import type { Address } from "../../domain/address.js";
import { canShipTo } from "../../domain/address.js";
import { OrderPlacedEvent } from "../../domain/events/order-placed.event.js";
import { billingDetails, Order } from "../../domain/order.js";
import {
  AddressNotFoundError,
  CountryNotShippedError,
} from "../../domain/shop.errors.js";
import {
  ADDRESS_REPOSITORY,
  type AddressRepository,
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../../domain/shop.repository.js";
import { PlaceOrderCommand } from "./place-order.command.js";

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: AddressRepository,
    private readonly queries: QueryBus,
    private readonly events: EventBus,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<bigint> {
    const address = await this.addresses.findById(command.addressId);
    if (!address?.isOwnedBy(command.userId)) {
      throw new AddressNotFoundError();
    }
    // Any own address can be billed, shipped there or not
    let billTo: Address | null = null;
    if (command.billing?.addressId) {
      billTo = await this.addresses.findById(command.billing.addressId);
      if (!billTo?.isOwnedBy(command.userId)) {
        throw new AddressNotFoundError();
      }
    }
    const shipping = address.toShippingAddress();
    const billing = command.billing
      ? billingDetails({
          address: billTo?.toShippingAddress() ?? null,
          shipping,
          company: command.billing.company,
          taxCode: command.billing.taxCode,
        })
      : null;
    // Fees as configured now; the order keeps them
    const config = await this.queries.execute(new GetConfigQuery());
    // Saved before the shop stopped shipping there
    if (!canShipTo(address.countryCode, config["shipping.countries"])) {
      throw new CountryNotShippedError(address.countryCode);
    }
    const fees = {
      currency: config["shop.currency"],
      taxRateBps: config["shop.taxRateBps"],
      flatFee: config["shipping.flatFee"],
      freeOver: config["shipping.freeOver"],
    };
    const variantIds = [
      ...new Set(command.items.map((i) => i.variantId)),
    ];
    const order = await this.orders.place(variantIds, (products) =>
      Order.place({
        userId: command.userId,
        lines: command.items,
        products,
        address: shipping,
        billing,
        paymentMethod: command.paymentMethod,
        note: command.note,
        fees,
        now: new Date(),
      }),
    );
    const { total, currency } = order.snapshot();
    this.events.publish(
      new OrderPlacedEvent(
        order.id!,
        command.userId,
        total,
        currency,
        variantIds,
        command.meta,
      ),
    );
    return order.id!;
  }
}
