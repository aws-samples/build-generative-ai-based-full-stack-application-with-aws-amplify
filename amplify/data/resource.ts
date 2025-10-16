import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Profile: a.model({
      id: a.string().required(),
      point: a.integer(),
      userId: a.string(),
      name: a.string(),
      email: a.string(),
      organization: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
  Reward: a.model({
      id: a.string().required(),
      point: a.integer(),
      userId: a.string(),
      classId: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
  Class: a.model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      image: a.string(),
      class_flag: a.integer(),
      courseId: a.id(),
      url: a.string(),
      transcript: a.string(),
      comments: a.string(),
      author: a.string(),
      searchableText: a.string(),
      tags: a.string().array(),
      difficulty: a.string(),
      course: a.belongsTo('Course', 'courseId'),
    })
    .authorization(allow => [allow.authenticated()]),
  Course: a.model({
      id: a.id(),
      name: a.string().required(),
      classes: a.hasMany('Class', 'courseId'),
    })
    .authorization(allow => [allow.authenticated()]),
  Comment: a.model({
      id: a.id().required(),
      classId: a.string(),
      content: a.string(),
      commentVersion: a.string(),
    })
    .authorization(allow => [allow.authenticated()]),

  BedrockAgentResponse: a.customType({
    response: a.string(),
    traces: a.string().array(),
  }),

  searchWithAgent: a
    .query()
    .arguments({ 
      query: a.string().required(),
      sessionId: a.string()
    })
    .returns(a.ref("BedrockAgentResponse"))
    .authorization(allow => allow.authenticated())
    .handler(a.handler.function("bedrockAgent")),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
