<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

# Deploying Serverless NestJS GraphQL API to Azure Functions

Getting `nest/azure-func-http` and `nest/graphql` to play well together is tricky. There are several GH issues and SO posts on this topic with little in the way of a solution. Additionally, none of the official nest.js docs or samples contain a configuration with both graphql and azure functions.

The one source of reliable information on this topic is a blog post by trilon.io [here](https://trilon.io/blog/deploy-nestjs-azure-functions). This is a good tutorial on creating a Nest.js REST api with `nest/azure-func-http`. However the tutorial steps to not carry over directly when creating a GraphQl API.

This repo and tutorial is a minimal example of a working integration of `nest/azure-func-http` and `nest/graphql`. I hope this helps some folks out!

## Starting Point

I started this repo with the boilerplate from [23-type-graphql](https://github.com/nestjs/nest/tree/master/sample/23-type-graphql). This is a working repo with Typescript, GraphQL, and Nest but NOT `nest/azure-func-http`

## Adding azure-func-http

```bash
$ nest add @nestjs/azure-func-http
```

This will install the function app boilerplate in the repo. Here is where this tutorial deviates from the trilion.io tutorial. Several of the default azure function configurations need to be altered along with some of your nest app code.

## Steps

### 1. Change build script in `package.json`

```diff
- "build": "nest build"
+ "build": "rimraf dist && tsc -p tsconfig.build.json"
```

### 2. Remove the include from your tsconfig.json

```diff
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "allowSyntheticDefaultImports": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true
  },
-  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

These two steps create seperate `/src` and `/main` directories in `/dist`.

- `/src` is for your source code
- `/main` is the entry point for the function app

### 3. Adjust Nest.js App

At this point the azure function will run but it will not resolve your GraphQL requests! Some changes need to be made to the nest app itself.

main.ts

```diff
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
+ app.enableCors();
+ app.setGlobalPrefix("api");
  await app.listen(3000);
}
bootstrap();
```

app.module.ts

```diff
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { RecipesModule } from "./recipes/recipes.module";

@Module({
  imports: [
    RecipesModule,
    GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
+     context: ({ req }) => ({ req }),
      autoSchemaFile: "schema.gql",
+     useGlobalPrefix: true
    })
  ]
})
export class AppModule {}
```

3. Adjust function app config

host.json

```diff
{
  "version": "2.0",
+ "extensions": {
+   "http": {
+     "routePrefix": "api"
+   }
  }
}
```

index.ts

```diff
import { Context, HttpRequest } from "@azure/functions";
import { AzureHttpAdapter } from "@nestjs/azure-func-http";
import { createApp } from "../src/main.azure";

export default function(context: Context, req: HttpRequest): void {
+ context.res = {
+   headers: {
+     "Content-Type": "application/json"
+   }
+ };
  AzureHttpAdapter.handle(createApp, context, req);
}

```

### Your GraphQL function app is good to go!!

```bash
$ npm run build && func host start
```

### Testing out the app

Add a sample body to the create method in `recipies.service.ts` for testing.

recipies.service.ts

```diff
  async create(data: NewRecipeInput): Promise<Recipe> {
+    return {
+      id: "sample",
+      title: data.title,
+      description: data.description,
+      creationDate: new Date(),
+      ingredients: data.ingredients
+    } as Recipe;
- return {} as any;
  }
```

fire up http://localhost:7071/api/graphql and run a mutation

```graphql
mutation($newRecipeData: NewRecipeInput!) {
  addRecipe(newRecipeData: $newRecipeData) {
    creationDate
  }
}
```

query variables

```json
{
  "newRecipeData": {
    "title": "Salad",
    "description": "Im trying to be healthy and im disappointed in my self",
    "ingredients": ["leaves", "sadness"]
  }
}
```

you should get back something like....

```json
{
  "data": {
    "addRecipe": {
      "creationDate": 1582340836192
    }
  }
}
```

---

## Deploying to Azure Functions

> _The battle has been won but the war has just begun_

Getting the function to run remotely on azure is not clear cut. I have found that the best configuration options are Function app V3 and WEBSITES_NODE_DEFAULT_VERSION set to ~12

Documentation on how to changes these Azure related setting can be found [here](https://docs.microsoft.com/en-us/azure/azure-functions/)

If you are using vscode there is some helpful extensions for deploying function apps. Your can read about that [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-function-vs-code?pivots=programming-language-typescript)

To build and run from the command line use:

```bash
$ npm run build && func azure functionapp publish <APP_NAME>
```
