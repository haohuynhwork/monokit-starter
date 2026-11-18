import type { BillingAddress } from "@/lib/types";

// An order's billing: company details first, then the address. Null
// billing means the shipping address with no company details.
export function BillingDetails({
  billing,
  className,
}: {
  billing: BillingAddress | null;
  className?: string;
}) {
  if (!billing) {
    return <p className={className}>Same as the shipping address.</p>;
  }
  return (
    <div className={className}>
      {billing.company && <p className="font-medium">{billing.company}</p>}
      {billing.taxCode && <p>Tax code: {billing.taxCode}</p>}
      <p className={billing.company ? undefined : "font-medium"}>
        {billing.recipientName}
      </p>
      <p>{billing.phone}</p>
      <p>{billing.line1}</p>
      {billing.line2 && <p>{billing.line2}</p>}
      <p>
        {[
          billing.city,
          billing.region,
          billing.postalCode,
          billing.countryCode,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
    </div>
  );
}
