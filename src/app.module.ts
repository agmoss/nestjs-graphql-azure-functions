import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { RecipesModule } from "./recipes/recipes.module";

@Module({
  imports: [
    RecipesModule,
    GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
      context: ({ req }) => ({ req }),
      autoSchemaFile: "schema.gql",
      useGlobalPrefix: true
    })
  ]
})
export class AppModule {}
