import { Logger } from "@nestjs/common";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateCurrencyCommand } from "../geo/application/commands/create-currency.command.js";
import { CreateLocaleCommand } from "../geo/application/commands/create-locale.command.js";
import { ListCurrenciesQuery } from "../geo/application/queries/list-currencies.query.js";
import { ListLocalesQuery } from "../geo/application/queries/list-locales.query.js";
import type { Actor } from "../geo/domain/geo.js";
import { ADMIN_PERMISSIONS } from "../users/domain/permissions.js";

const SYSTEM: Actor = {
  id: 0n,
  permissions: ADMIN_PERMISSIONS,
};

const LOCALES = [
  {
    code: "en-US",
    name: "English (United States)",
    nativeName: "English (United States)",
    isDefault: true,
  },
  {
    code: "vi-VN",
    name: "Vietnamese (Vietnam)",
    nativeName: "Tiếng Việt (Việt Nam)",
  },
];

// Only into empty tables, so staff edits survive re-seeding: the base
// currency (rate 1) and en-US (default) + vi-VN
export async function seedLocales(
  commands: CommandBus,
  queries: QueryBus,
): Promise<void> {
  const log = new Logger("seed");
  const currencies = await queries.execute(new ListCurrenciesQuery(false));
  if (currencies.items.length === 0) {
    const code = currencies.base;
    const name =
      new Intl.DisplayNames(
        [
          "en",
        ],
        {
          type: "currency",
        },
      ).of(code) ?? code;
    const decimals =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    await commands.execute(
      new CreateCurrencyCommand(
        {
          code,
          name,
          decimals,
          rate: "1",
        },
        SYSTEM,
      ),
    );
    log.log(`Currencies: added ${code} (base)`);
  }
  if ((await queries.execute(new ListLocalesQuery(false))).length === 0) {
    for (const [position, locale] of LOCALES.entries()) {
      await commands.execute(
        new CreateLocaleCommand(
          {
            ...locale,
            position,
          },
          SYSTEM,
        ),
      );
    }
    log.log(`Locales: added ${LOCALES.map((l) => l.code).join(", ")}`);
  }
}
