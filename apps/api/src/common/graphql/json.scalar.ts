import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

// Free-form JSON (page blocks, settings, translation maps): the zod schemas
// that validate the REST bodies validate it too.
export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Any JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: function literal(
    node: ValueNode,
    variables?: Record<string, unknown> | null,
  ): unknown {
    switch (node.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return node.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(node.value);
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return node.values.map((v) => literal(v, variables));
      case Kind.OBJECT:
        return Object.fromEntries(
          node.fields.map((f) => [
            f.name.value,
            literal(f.value, variables),
          ]),
        );
      case Kind.VARIABLE:
        return variables?.[node.name.value];
      default:
        return undefined;
    }
  },
});
