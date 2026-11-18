import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import type { OrderSummary } from "@/lib/types";
import { Heading } from "@/routes/_site/account/-lib/heading";
import { STATUS_LABEL } from "@/routes/admin/_auth/orders/-lib/status";

export const Route = createFileRoute("/_site/account/")({
  loader: async () => {
    const res = await api<OrderSummary[]>("/me/orders?limit=5&offset=0");
    return {
      orders: res.status === "success" && res.data ? res.data : [],
    };
  },
  head: () => ({
    meta: [
      {
        title: "My account",
      },
    ],
  }),
  component: AccountPage,
});

// Overview: profile and recent orders; the sidebar leads to the rest
function AccountPage() {
  const { user } = Route.useRouteContext();
  const { orders } = Route.useLoaderData();
  const rows: [
    string,
    string,
  ][] = [
    [
      "Name",
      user.displayName,
    ],
    [
      "Email",
      user.email,
    ],
    ...(user.createdAt
      ? [
          [
            "Joined",
            new Date(user.createdAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            }),
          ] as [
            string,
            string,
          ],
        ]
      : []),
  ];
  return (
    <>
      <Heading title="My account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              <Link to="/account/profile" className="underline">
                Edit profile
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-[6rem_1fr] gap-y-3 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-all">{value}</dd>
                </div>
              ))}
            </dl>
            {isStaff(user) && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                asChild
              >
                <Link to="/admin">Open the admin panel</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              <Link to="/account/orders" className="underline">
                All orders
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders yet.{" "}
                <Link to="/shop/products" className="underline">
                  Browse products
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/account/orders/$id"
                      params={{
                        id: o.id,
                      }}
                      className="flex justify-between gap-4 py-2 hover:underline"
                    >
                      <span>
                        #{o.id} ·{" "}
                        {new Date(o.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {formatMoney(o.total, o.currency)} ·{" "}
                        {STATUS_LABEL[o.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
