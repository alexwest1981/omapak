/**
 * OpenAPI 3.1 document served at /v1/openapi.json — the machine-readable
 * contract the future desktop app codes against. Hand-maintained alongside
 * the handlers; scripts/e2e.mjs asserts it stays in sync with live routes.
 */

const error = { type: "object", properties: { error: { type: "string" } }, required: ["error"] };

const rating = {
  type: ["object", "null"],
  properties: {
    average: { type: "number", minimum: 1, maximum: 5 },
    count: { type: "integer", minimum: 0 },
  },
  required: ["average", "count"],
};

const categoryId = {
  type: "string",
  enum: ["audiovideo", "development", "education", "game", "graphics", "network", "office", "science", "settings", "system", "utility"],
};

const appSummary = {
  type: "object",
  properties: {
    app_id: { type: "string", examples: ["io.github.dprietob.luma"] },
    source: { type: "string", enum: ["omapak", "flathub"] },
    name: { type: "string" },
    summary: { type: "string" },
    icon: { type: ["string", "null"] },
    developer: { type: ["string", "null"] },
    license: { type: ["string", "null"] },
    category: categoryId,
    tags: { type: "array", items: { type: "string" } },
    rating,
    verdict: { type: "string", enum: ["published", "build_failed", "unpublished"] },
    certified: { type: "boolean" },
    advisory_average: { type: "number" },
    report_available: { type: "boolean" },
  },
  required: ["app_id", "source", "name", "summary", "icon", "developer", "license", "category", "tags", "rating"],
};

const appDetail = {
  ...appSummary,
  properties: {
    ...appSummary.properties,
    description: { type: ["string", "array", "null"], items: { type: "string" } },
    homepage: { type: ["string", "null"] },
    source_repo: { type: ["string", "null"] },
    bugtracker: { type: ["string", "null"] },
    screenshots: { type: "array", items: { type: "string" } },
    install: { type: "string", examples: ["flatpak install omapak io.github.dprietob.luma"] },
    report_url: { type: ["string", "null"] },
  },
  required: [...appSummary.required, "install"],
};

const review = {
  type: "object",
  properties: {
    id: { type: "integer" },
    app_id: { type: "string" },
    user_id: { type: "integer", description: "lets clients flag the viewer's own review" },
    rating: { type: "integer", minimum: 1, maximum: 5 },
    body: { type: "string" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
    author: {
      type: "object",
      properties: { display_name: { type: "string" } },
      required: ["display_name"],
    },
  },
  required: ["id", "app_id", "rating", "body", "created_at", "updated_at", "author"],
};

const me = {
  type: "object",
  properties: {
    id: { type: "integer" },
    email: { type: "string", format: "email" },
    display_name: { type: "string" },
    created_at: { type: "string", format: "date-time" },
  },
  required: ["id", "email", "display_name", "created_at"],
};

const auth = [{ cookie: [] }, { bearerAuth: [] }];

export function openapi(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Omapak API",
      version: "1.0.0",
      description:
        "The store API behind omapak.org. The website and the omapak desktop app both populate from these endpoints. Apps come from the omapak-repo R2 bucket; reviews and accounts from D1. Public reads need no auth; reviews and profile writes need a session (httpOnly cookie via magic-link sign-in, or Authorization: Bearer <jwt>).",
    },
    servers: [{ url: "https://api.omapak.org" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookie: { type: "apiKey", in: "cookie", name: "oma_session" },
      },
      schemas: { AppSummary: appSummary, AppDetail: appDetail, Review: review, Me: me, Rating: rating, Error: error },
    },
    paths: {
      "/v1/apps": {
        get: {
          summary: "List apps (omapak hosted + flathub pass-through)",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "case-insensitive match on app_id, name, summary" },
            { name: "source", in: "query", schema: { type: "string", enum: ["all", "omapak", "flathub"] }, description: "defaults to all" },
            { name: "category", in: "query", schema: categoryId },
            { name: "limit", in: "query", schema: { type: "integer", default: 500, maximum: 2000 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            200: {
              description: "paged app list; category counts reflect the current source filter, not q",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      apps: { type: "array", items: { $ref: "#/components/schemas/AppSummary" } },
                      categories: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { id: categoryId, label: { type: "string" }, count: { type: "integer" } },
                          required: ["id", "label", "count"],
                        },
                      },
                    },
                    required: ["total", "apps", "categories"],
                  },
                },
              },
            },
          },
        },
      },
      "/v1/apps/{app_id}": {
        get: {
          summary: "App detail",
          parameters: [{ name: "app_id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "app detail", content: { "application/json": { schema: { $ref: "#/components/schemas/AppDetail" } } } },
            404: { description: "unknown app", content: { "application/json": { schema: error } } },
          },
        },
      },
      "/v1/apps/{app_id}/reviews": {
        get: {
          summary: "List reviews for an app",
          parameters: [
            { name: "app_id", in: "path", required: true, schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            200: {
              description: "reviews, newest first",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      app_id: { type: "string" },
                      rating: { $ref: "#/components/schemas/Rating" },
                      reviews: { type: "array", items: { $ref: "#/components/schemas/Review" } },
                    },
                    required: ["app_id", "reviews"],
                  },
                },
              },
            },
            404: { description: "unknown app", content: { "application/json": { schema: error } } },
          },
        },
        post: {
          summary: "Create or update your review (one per user per app)",
          security: auth,
          parameters: [{ name: "app_id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, body: { type: "string", maxLength: 4000 } },
                  required: ["rating"],
                },
              },
            },
          },
          responses: {
            201: { description: "review stored", content: { "application/json": { schema: { $ref: "#/components/schemas/Review" } } } },
            400: { description: "invalid rating/body", content: { "application/json": { schema: error } } },
            401: { description: "not signed in", content: { "application/json": { schema: error } } },
            404: { description: "unknown app", content: { "application/json": { schema: error } } },
          },
        },
      },
      "/v1/reviews/{id}": {
        delete: {
          summary: "Delete your review",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            204: { description: "deleted" },
            401: { description: "not signed in", content: { "application/json": { schema: error } } },
            404: { description: "not yours or missing", content: { "application/json": { schema: error } } },
          },
        },
      },
      "/v1/categories": {
        get: {
          summary: "Category taxonomy with counts (all sources)",
          responses: {
            200: {
              description: "categories ordered by count desc",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      categories: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { id: categoryId, label: { type: "string" }, count: { type: "integer" } },
                          required: ["id", "label", "count"],
                        },
                      },
                    },
                    required: ["categories"],
                  },
                },
              },
            },
          },
        },
      },
      "/v1/featured": {
        get: {
          summary: "Featured hero app — top-rated omapak apps, rotated daily",
          responses: {
            200: {
              description: "featured app id",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { app_id: { type: "string" }, reason: { type: "string" } },
                    required: ["app_id", "reason"],
                  },
                },
              },
            },
            404: { description: "empty catalog", content: { "application/json": { schema: error } } },
          },
        },
      },
      "/v1/auth/magic-link": {
        post: {
          summary: "Email a single-use sign-in link (15 min TTL). Always 202 on valid input.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] } } },
          },
          responses: {
            202: {
              description: "link sent (or, in local dev mode, returned as dev_link)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" }, dev_link: { type: "string" } },
                    required: ["ok"],
                  },
                },
              },
            },
            400: { description: "invalid email", content: { "application/json": { schema: error } } },
            429: { description: "rate limited", content: { "application/json": { schema: error } } },
          },
        },
      },
      "/v1/auth/verify": {
        get: {
          summary: "Consume a magic link: sets the session cookie, redirects to the site",
          parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
          responses: {
            302: { description: "redirect to {SITE_ORIGIN}/auth/callback (with ?error=invalid on failure)" },
          },
        },
      },
      "/v1/auth/logout": {
        post: {
          summary: "Clear the session cookie",
          responses: { 200: { description: "signed out" } },
        },
      },
      "/v1/me": {
        get: {
          summary: "Current user",
          security: auth,
          responses: {
            200: { description: "signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/Me" } } } },
            401: { description: "not signed in", content: { "application/json": { schema: error } } },
          },
        },
        patch: {
          summary: "Update display name",
          security: auth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { display_name: { type: "string", maxLength: 40 } }, required: ["display_name"] } } },
          },
          responses: {
            200: { description: "updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Me" } } } },
            400: { description: "invalid name", content: { "application/json": { schema: error } } },
            401: { description: "not signed in", content: { "application/json": { schema: error } } },
          },
        },
      },
    },
  };
}
