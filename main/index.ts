import { Context, HttpRequest } from "@azure/functions";
import { AzureHttpAdapter } from "@nestjs/azure-func-http";
import { createApp } from "../src/main.azure";

export default function(context: Context, req: HttpRequest): void {
  context.res = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  AzureHttpAdapter.handle(createApp, context, req);
}
