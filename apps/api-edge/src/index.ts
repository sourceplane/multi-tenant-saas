import type { Env } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "api-edge",
        environment: env.ENVIRONMENT ?? "local",
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      {
        error: "not_found",
        message: "Resource not found",
        path: url.pathname,
      },
      { status: 404 }
    );
  },
} satisfies ExportedHandler<Env>;
