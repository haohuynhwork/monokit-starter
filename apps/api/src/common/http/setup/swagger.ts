import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { docsEnabled } from "./docs.js";

// UI at [API_PREFIX]/docs, spec at [API_PREFIX]/docs-json (see docsEnabled)
export function setupSwagger(app: INestApplication): void {
  if (!docsEnabled()) {
    return;
  }

  const builder = new DocumentBuilder().setTitle("CMS API").addBearerAuth();
  for (const [name, description] of TAGS) {
    builder.addTag(name, description);
  }
  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
      // Search box above the groups
      filter: true,
    },
  });
}

// Group order in the UI (it follows this list; tags missing here go last).
// Add a context's @ApiTags name here when you create one.
const TAGS: [
  name: string,
  description: string,
][] = [
  [
    "App",
    "Root endpoint",
  ],
  [
    "default",
    "Untagged endpoints",
  ],
  [
    "health",
    "Liveness and readiness",
  ],
  [
    "public",
    "What the website reads and sends, no sign-in",
  ],
  [
    "auth",
    "Sign up, sign in, tokens",
  ],
  [
    "users",
    "Accounts and roles",
  ],
  [
    "notifications",
    "In-app notifications",
  ],
  [
    "audit",
    "Who did what, when (admin)",
  ],
  [
    "configs",
    "Site settings (admin)",
  ],
  [
    "assets",
    "Uploaded files and folders",
  ],
  [
    "pages",
    "Pages, layouts and menus (panel)",
  ],
  [
    "contact",
    "Contact-form messages inbox (panel)",
  ],
  [
    "posts",
    "Posts and tags (panel)",
  ],
  [
    "content",
    "Rich-text bodies: preview what saving keeps (panel)",
  ],
  [
    "geo",
    "Countries, regions, locales, currencies",
  ],
  [
    "shop",
    "Products, categories, orders",
  ],
  [
    "mail",
    "Outgoing email",
  ],
];
